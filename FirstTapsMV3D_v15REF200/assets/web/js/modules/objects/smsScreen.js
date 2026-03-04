/**
 * SMS Screen Module
 * Creates and manages floating SMS conversation screens
 */

// SMSScreen class - will use global THREE
window.SMSScreenClass = class SMSScreen {
    constructor(contactData, scene) {
        this.contactData = contactData;
        this.scene = scene;
        this.messages = [];
        this.isVisible = false;
        
        // Screen properties - larger size for better full-screen coverage
        this.screenWidth = 9;  // Increased from 6 to 9 (50% larger)
        this.screenHeight = 12; // Increased from 8 to 12 (50% larger)
        this.canvasWidth = 900;  // Increased from 600 to 900
        this.canvasHeight = 1200; // Increased from 800 to 1200
        
        // UI state
        this.currentInputText = '';
        this.scrollOffset = 0;
        this.maxScrollOffset = 0;
        this.lastMessageCount = 0; // Track message count to avoid unnecessary scroll calculations
        
        // Input state management for visual feedback
        this.isInputActive = false;
        this.lastCursorBlink = null;
        this.cursorBlinkTimer = null;
        
        // CRITICAL FIX: Render guard to prevent infinite loops
        this.isRendering = false;
        this.lastRenderTime = 0;
        this.renderThrottleMs = 0; // PERMANENT FIX: Disable throttling for real-time SMS updates
        
        this.createScreen();
        this.setupInputHandling();

        // Defer initial conversation load until the screen is shown
        this.hasLoadedConversation = false;
        
        // Listen for text updates via the global event bus
        this.handleSmsTextInput = (event) => {
            const { contactId, text } = event.detail;
            if (contactId === this.contactData.id) {
                this.updateInputText(text);
            }
        };
        window.addEventListener('sms-text-input', this.handleSmsTextInput);

        // 🔥 SIMPLIFIED: Use SMS Simple Core for reliable message updates
        console.log(`� SMS Screen: Registering with Simple Core for ${this.contactData.name}`);
        
        // Register with the simple core for updates
        if (window.smsSimpleCore) {
            window.smsSimpleCore.registerSmsScreen(this.contactData.id, this);
        } else {
            console.error('� SMS Simple Core not available!');
        }
        
        // Keep only essential emergency listeners as backup
        this.handleEmergencyUpdate = (event) => {
            if (event.detail.contactId === this.contactData.id && event.detail.messages) {
                console.error(`📱 [EMERGENCY] Emergency SMS update for ${this.contactData.name}`);
                this.updateMessages(event.detail.messages, 'emergency');
            }
        };
        window.addEventListener('sms-emergency-update', this.handleEmergencyUpdate);
        
        // Set up periodic self-healing health check
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 15000); // Check every 15 seconds
        
        console.log(`💬 SMS screen initialized for ${this.contactData.name}`);
    }
    
    /**
     * Create the 3D screen mesh with canvas texture
     */
    createScreen() {
        // Create canvas for rendering SMS interface
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.ctx = this.canvas.getContext('2d');
        
        // Create screen geometry
        const geometry = new THREE.PlaneGeometry(this.screenWidth, this.screenHeight);
        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.minFilter = THREE.LinearFilter;
        
        // Create material
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.userData = {
            type: 'smsScreen',
            isSmsScreen: true, // Add this flag
            contactId: this.contactData.id,
            smsScreen: this,
            isInteractable: true
        };
        
        // Create invisible interaction overlay - larger and more reliable for touch
        const overlayGeometry = new THREE.PlaneGeometry(this.screenWidth * 1.2, this.screenHeight * 1.2);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.0, // Completely invisible
            side: THREE.DoubleSide
        });
        
        this.interactionOverlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        this.interactionOverlay.userData = {
            type: 'smsScreen',
            isSmsScreen: true,
            isInteractionOverlay: true,
            contactId: this.contactData.id,
            contactName: this.contactData.name,
            fileName: this.contactData.name || this.contactData.fileName || this.contactData.id,
            smsScreen: this,
            parentContact: this.contactData,
            isInteractable: true
        };
        
        // Position overlay slightly in front of the screen
        this.interactionOverlay.position.z = 0.01;
        
        // Initially hidden
        this.mesh.visible = false;
        this.interactionOverlay.visible = false;
        this.scene.add(this.mesh);
        this.scene.add(this.interactionOverlay);
        
        // Render initial interface
        this.renderInterface();
    }

    /**
     * Get the mesh object for interaction handling
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Render the SMS interface on canvas
     * @param {boolean} bypassThrottle - PERMANENT FIX: Default true for real-time message updates
     */
    renderInterface(bypassThrottle = true, updateType = 'unknown') {
        // CRITICAL FIX: Prevent infinite rendering loops
        const now = Date.now();
        if (this.isRendering && !bypassThrottle) {
            console.log('📱 ⚠️ SMS renderInterface already in progress, skipping to prevent infinite loop');
            return;
        }
        
        // 🔧 FAILSAFE: Always allow failsafe and emergency updates
        const isFailsafeUpdate = updateType?.includes('failsafe') || updateType === 'emergency';
        
        // SMART THROTTLING: Different throttling for different update types
        let throttleMs = this.renderThrottleMs;
        let shouldThrottle = !bypassThrottle;
        
        if (isFailsafeUpdate) {
            // 🔧 FAILSAFE updates: Absolutely no throttling - highest priority
            throttleMs = 0;
            shouldThrottle = false;
            console.error('🔧 FAILSAFE: renderInterface bypassing ALL throttling - emergency update');
        } else if (updateType === 'critical' || updateType === 'incoming_message') {
            // Critical updates (incoming messages): No throttling
            throttleMs = 0;
            shouldThrottle = false;
            console.log('🚨 CRITICAL UPDATE: No throttling for incoming message');
        } else if (updateType === 'scroll') {
            // Scroll updates: 60fps throttling (16ms)
            throttleMs = 16;
            shouldThrottle = true;
        } else if (updateType === 'background') {
            // Background updates: Standard throttling  
            throttleMs = 100;
            shouldThrottle = true;
        } else if (bypassThrottle) {
            // Legacy bypass: Reduced throttling instead of none
            throttleMs = 8; // 125fps max instead of unlimited
            shouldThrottle = true;
        }
        
        // EXPERT FIX #2: Apply smart throttling based on update type (except failsafe)
        if (!isFailsafeUpdate && shouldThrottle && throttleMs > 0 && (now - this.lastRenderTime < throttleMs)) {
            // Throttling log disabled to reduce console spam
            // console.log(`📱 ⚠️ SMS renderInterface throttled (${updateType}): ${now - this.lastRenderTime}ms < ${throttleMs}ms`);
            return;
        }
        
        if (isFailsafeUpdate) {
            console.error('🔧 FAILSAFE: CRITICAL renderInterface execution - no delays');
        } else if (updateType === 'critical' || updateType === 'incoming_message') {
            console.error('🚨 CRITICAL: renderInterface for incoming message - NO throttling');
        } else if (!bypassThrottle) {
            console.log(`⚡ SMART THROTTLE: ${updateType} update with ${throttleMs}ms throttling`);
        } else {
            console.error('🚨 EXPERT FIX #2: renderInterface bypassing ALL throttling - urgent update');
        }
        
        this.isRendering = true;
        this.lastRenderTime = now;
        
        // Minimal logging for render cycles (only for critical updates)
        if (updateType === 'critical' || updateType === 'incoming_message') {
            console.log('📱 🔄 SMS SCREEN renderInterface starting (critical)');
        }
        
        try {
            const ctx = this.ctx;
            
            // Clear canvas
            ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Header
            this.renderHeader(ctx);
            
            // Messages area
            this.renderMessages(ctx);
            
            // Input area
            this.renderInputArea(ctx);
            
            // Update texture
            this.texture.needsUpdate = true;
            
            // Only log completion for critical updates
            if (updateType === 'critical' || updateType === 'incoming_message') {
                console.log('📱 ✅ renderInterface completed - texture updated');
            }
        } catch (error) {
            console.error('📱 ❌ renderInterface error:', error);
        } finally {
            this.isRendering = false;
        }
    }
    
    /**
     * Render header with contact name
     */
    renderHeader(ctx) {
        const headerHeight = 240; // 3x larger to accommodate much bigger fonts (160 * 1.5)
        
        // Header background
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(0, 0, this.canvasWidth, headerHeight);
        
        // Contact name - 3x larger font (2x * 1.5)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 84px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(this.contactData.name, 20, 105);
        
        // Phone number - 3x larger font (2x * 1.5)
        ctx.font = '54px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(this.contactData.phoneNumber, 20, 180);
        
        // Close button - 6x larger font (2x * 3x for better mobile tap target)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.canvasWidth - 120, 10, 100, 60); // 2x larger background area
        ctx.fillStyle = 'white';
        ctx.font = '120px Arial'; // 2x larger font (60px -> 120px)
        ctx.textAlign = 'center';
        ctx.fillText('X', this.canvasWidth - 70, 70); // Adjusted position for larger button
    }
    
    /**
     * Calculate scroll bounds based on total message content height
     * This ensures maxScrollOffset is calculated correctly before rendering
     */
    calculateScrollBounds(ctx, messageAreaHeight) {
        if (this.messages.length === 0) {
            this.maxScrollOffset = 0;
            return;
        }

        // Ensure we have a valid context
        if (!ctx) {
            ctx = this.ctx;
        }
        if (!ctx) {
            console.warn('📱 No canvas context available for scroll calculation');
            this.maxScrollOffset = 0;
            return;
        }
        
        // If messageAreaHeight not provided, calculate it
        if (typeof messageAreaHeight !== 'number' || isNaN(messageAreaHeight)) {
            const headerHeight = 240;
            const inputHeight = 100;
            messageAreaHeight = this.canvasHeight - headerHeight - inputHeight;
        }

        let totalContentHeight = 0;
        const bubblePadding = 15;
        const bubbleMargin = 10;

        // Calculate height for each message without rendering
        this.messages.forEach(message => {
            ctx.font = '48px Arial';
            const maxWidth = this.canvasWidth * 0.7;
            const wrappedText = this.wrapText(ctx, message.text, maxWidth);
            const textHeight = wrappedText.length * 60;
            const bubbleHeight = textHeight + (bubblePadding * 2);
            totalContentHeight += bubbleHeight + bubbleMargin;
        });

        // Add vertical padding and calculate max scroll offset
        const verticalPadding = 40; // 20 top, 20 bottom
        const bottomBuffer = 300; // Extra space to ensure newest message is fully visible
        this.maxScrollOffset = Math.max(0, totalContentHeight + verticalPadding + bottomBuffer - messageAreaHeight);
        
        console.log(`📱 Calculated scroll bounds: totalHeight=${totalContentHeight}, maxScroll=${this.maxScrollOffset}`);
    }
    
    /**
     * Render message bubbles
     */
    renderMessages(ctx) {
        // Only log for debugging when there are no messages or critical issues
        if (this.messages.length === 0) {
            console.log('📱 🚨 SMS SCREEN renderMessages: No messages to render');
        }
        
        const headerHeight = 240; // 3x larger to match header (160 * 1.5)
        const inputHeight = 100;
        const messageAreaHeight = this.canvasHeight - headerHeight - inputHeight;
        const messageAreaY = headerHeight;
        
        // Clip rendering to the message area to prevent overflow
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, messageAreaY, this.canvasWidth, messageAreaHeight);
        ctx.clip();

        // Define constants for consistency with calculateScrollBounds
        const bubblePadding = 15;
        const bubbleMargin = 10;
        
        // Message area background - lighter, more native-like
        ctx.fillStyle = '#F2F2F7'; // Light gray background like iOS Messages
        ctx.fillRect(0, messageAreaY, this.canvasWidth, messageAreaHeight);
        
        if (this.messages.length === 0) {
            console.log('📱 � No messages to render - showing empty state');
            // Enhanced empty state that looks like a proper messaging interface
            const centerX = this.canvasWidth / 2;
            const centerY = messageAreaY + messageAreaHeight / 2;
            
            // Message icon background circle
            ctx.fillStyle = 'rgba(74, 144, 226, 0.2)';
            ctx.beginPath();
            ctx.arc(centerX, centerY - 80, 60, 0, 2 * Math.PI);
            ctx.fill();
            
            // Message icon - use simple text instead of emoji
            ctx.fillStyle = 'rgba(74, 144, 226, 0.8)';
            ctx.font = '60px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SMS', centerX, centerY - 50);
            
            // Main message
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Chat with ${this.contactData.name}`, centerX, centerY + 40);
            
            // Subtitle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '36px Arial';
            ctx.fillText('Tap the input field below to start messaging', centerX, centerY + 90);
            
            // Helpful tip
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '28px Arial';
            ctx.fillText('Messages are secured end-to-end', centerX, centerY + 140);
            
            ctx.restore();
            return;
        }
        
        // --- STEP 1: Calculate total content height independently (only if message count changed) ---
        if (this.messages.length !== this.lastMessageCount) {
            this.calculateScrollBounds(ctx, messageAreaHeight);
            this.lastMessageCount = this.messages.length;
        }

        // --- STEP 2: Render visible messages based on scroll offset ---
        let yPos = messageAreaY + 20 - this.scrollOffset;
        
        this.messages.forEach((message, index) => {
            // The 'type' property from Flutter ('sent'/'received') determines if a message is outgoing.
            const isOutgoing = message.type === 'sent';
            
            // ENHANCED NATIVE-STYLE BUBBLES: More realistic colors and styling
            const bubbleColor = isOutgoing ? '#007AFF' : '#E5E5EA'; // iOS-style colors
            const textColor = isOutgoing ? 'white' : '#000000'; // Black text on light incoming bubbles
            const shadowColor = 'rgba(0, 0, 0, 0.1)'; // Subtle shadow for depth
            
            // Measure text - 3x larger font for messages (2x * 1.5)
            ctx.font = '48px Arial';
            const maxWidth = this.canvasWidth * 0.7;
            const wrappedText = this.wrapText(ctx, message.text, maxWidth);
            const textHeight = wrappedText.length * 60; // 3x line height (2x * 1.5)
            const bubbleHeight = textHeight + (bubblePadding * 2);
            
            // Optimization: Skip if bubble is outside visible area
            if (yPos + bubbleHeight < messageAreaY || yPos > messageAreaY + messageAreaHeight) {
                yPos += bubbleHeight + bubbleMargin;
                return;
            }
            
            // Bubble position
            const bubbleWidth = Math.min(maxWidth + (bubblePadding * 2), this.canvasWidth * 0.8);
            const bubbleX = isOutgoing ? 
                this.canvasWidth - bubbleWidth - 20 : 
                20;
            
            // Draw bubble shadow for depth (iOS-style)
            ctx.fillStyle = shadowColor;
            this.drawRoundedRect(ctx, bubbleX + 2, yPos + 2, bubbleWidth, bubbleHeight, 18);
            
            // Draw main bubble with more rounded corners
            ctx.fillStyle = bubbleColor;
            this.drawRoundedRect(ctx, bubbleX, yPos, bubbleWidth, bubbleHeight, 18);
            
            // Draw text - with 3x larger line spacing (2x * 1.5)
            ctx.fillStyle = textColor;
            ctx.textAlign = 'left';
            wrappedText.forEach((line, lineIndex) => {
                ctx.fillText(line, bubbleX + bubblePadding, yPos + bubblePadding + 54 + (lineIndex * 60)); // 3x spacing
            });
            
            // Timestamp - smaller, more subtle styling like native apps
            const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
            ctx.font = '28px Arial'; // Smaller timestamp font
            ctx.fillStyle = isOutgoing ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'; // Better contrast
            ctx.textAlign = 'right';
            const timestampX = bubbleX + bubbleWidth - bubblePadding;
            ctx.fillText(timestamp, timestampX, yPos + bubbleHeight - 10);
            
            // Message status (for outgoing messages) - native-style delivered indicator
            if (isOutgoing) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = '24px Arial'; // Smaller status indicator
                ctx.fillText('✓✓', bubbleX + bubbleWidth - bubblePadding - 35, yPos + bubbleHeight - 10); // Double checkmark for delivered
            }
            
            yPos += bubbleHeight + bubbleMargin;
        });

        // Restore canvas state after clipping
        ctx.restore();
    }
    
    /**
     * Render input area
     */
    renderInputArea(ctx) {
        const inputHeight = 100;
        const inputY = this.canvasHeight - inputHeight;
        
        // Input background
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0, inputY, this.canvasWidth, inputHeight);
        
        // Input border
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, inputY, this.canvasWidth, inputHeight);
        
        // Input field background - make it more prominent
        const inputFieldHeight = 40;
        const inputFieldY = inputY + 20;
        const inputFieldX = 20;
        const inputFieldWidth = this.canvasWidth - 120;
        
        // Add subtle glow effect to input field
        ctx.fillStyle = '#2a2a2a';
        this.drawRoundedRect(ctx, inputFieldX, inputFieldY, inputFieldWidth, inputFieldHeight, 5);
        
        // Input field border - make it more visible when active
        const isActive = this.isInputActive || this.currentInputText;
        ctx.strokeStyle = isActive ? '#4a90e2' : 'rgba(74, 144, 226, 0.5)';
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(inputFieldX, inputFieldY, inputFieldWidth, inputFieldHeight, 5);
        ctx.stroke();
        
        // Input text - 3x larger font (2x * 1.5)
        ctx.font = '48px Arial';
        ctx.textAlign = 'left';
        const displayText = this.currentInputText || 'Type a message...';
        const textColor = this.currentInputText ? 'white' : 'rgba(255, 255, 255, 0.6)';
        ctx.fillStyle = textColor;
        
        // Add input field icon if no text - use simple text instead of emoji
        if (!this.currentInputText) {
            ctx.fillStyle = 'rgba(74, 144, 226, 0.6)';
            ctx.font = '24px Arial';
            ctx.fillText('Type', inputFieldX + 8, inputFieldY + 32);
        }
        
        // Clip text to input field
        ctx.save();
        ctx.beginPath();
        ctx.rect(inputFieldX + (this.currentInputText ? 10 : 45), inputFieldY, inputFieldWidth - (this.currentInputText ? 20 : 55), inputFieldHeight);
        ctx.clip();
        ctx.fillStyle = textColor;
        
        // Render the actual text
        const textX = inputFieldX + (this.currentInputText ? 15 : 50);
        const textY = inputFieldY + 50;
        ctx.fillText(displayText, textX, textY);
        
        // Draw blinking cursor when active and has text
        if (this.isInputActive && this.currentInputText) {
            const textWidth = ctx.measureText(this.currentInputText).width;
            const cursorX = textX + textWidth + 2;
            const cursorY = inputFieldY + 10;
            const cursorHeight = 30;
            
            // Make cursor blink every 500ms
            const now = Date.now();
            if (!this.lastCursorBlink) this.lastCursorBlink = now;
            const shouldShowCursor = Math.floor((now - this.lastCursorBlink) / 500) % 2 === 0;
            
            if (shouldShowCursor) {
                ctx.fillStyle = '#4a90e2';
                ctx.fillRect(cursorX, cursorY, 2, cursorHeight);
            }
            
            // TEMPORARY FIX: Completely disable cursor blink timer to prevent infinite loop
            // TODO: Implement proper cursor blink without setTimeout in renderInterface
            // if (this.isInputActive && !this.cursorBlinkTimer) {
            //     this.cursorBlinkTimer = setTimeout(() => {
            //         this.cursorBlinkTimer = null;
            //         if (this.isInputActive) {
            //             this.renderInterface();
            //         }
            //     }, 250);
            // }
        }
        
        ctx.restore();
        
        // Send button - 3x larger font (2x * 1.5)
        const sendButtonX = this.canvasWidth - 80;
        const sendButtonY = inputFieldY;
        const sendButtonWidth = 60;
        const sendButtonHeight = inputFieldHeight;
        
        ctx.fillStyle = this.currentInputText.trim() ? '#4a90e2' : '#555555';
        this.drawRoundedRect(ctx, sendButtonX, sendButtonY, sendButtonWidth, sendButtonHeight, 5);
        
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Send', sendButtonX + sendButtonWidth / 2, sendButtonY + 50); // Adjusted Y position
        
        // Typing indicator placeholder - 3x larger font (2x * 1.5)
        if (false) { // Will implement later
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '42px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Contact is typing...', 20, inputY + 75);
        }
    }
    
    /**
     * Wrap text to fit within width
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    /**
     * Draw rounded rectangle
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Setup input handling
     */
    setupInputHandling() {
        // Use the central channel manager to register the listener
        if (window.app?.smsChannelManager) {
            console.log(`📱 Registering SMS input listener for ${this.contactData.id} via channel manager.`);
            window.app.smsChannelManager.registerSmsInputListener(this.contactData.id);
        } else {
            console.warn('📱 smsChannelManager not available to register listener.');
        }
        
        // Setup input text listener
        if (window.app && window.app.smsIntegrationManager) {
            window.app.smsIntegrationManager.onInputTextUpdated = (text) => {
                this.updateInputText(text);
                this.renderInterface();
            };
        }
    }
    
    /**
     * Set screen position
     */
    setPosition(position) {
        this.mesh.position.copy(position);
        this.interactionOverlay.position.copy(position);
        this.interactionOverlay.position.z += 0.01; // Keep overlay slightly in front
    }
    
    /**
     * Show screen
     */
    show() {
        this.mesh.visible = true;
        this.interactionOverlay.visible = true;
        this.isVisible = true;

        // CRITICAL: Load or refresh the conversation only when the screen becomes visible
        if (!this.hasLoadedConversation) {
            this.loadRealConversation();
            this.hasLoadedConversation = true;
        } else {
            // If already loaded, check for new messages
            this.refreshConversation();
        }

        this.renderInterface();
    }
    
    /**
     * Hide screen
     */
    hide() {
        // Deactivate input state first
        this.deactivateInput();
        
        // Clear current input text
        this.currentInputText = '';
        
        // Hide visual elements
        this.mesh.visible = false;
        this.interactionOverlay.visible = false;
        this.isVisible = false;
        
        // Force re-render to clear input state
        this.renderInterface();
        
        console.log('📱 SMS screen hidden and input state cleared');
    }
    
    /**
     * Update messages
     */
    updateMessages(messages, updateType = 'background') {
        // CRITICAL DEBUG: Enhanced logging for empty screen issue
        console.error('🚨 SMS SCREEN updateMessages called:');
        console.error('📱 Contact ID:', this.contactData?.id);
        console.error('📱 Contact name:', this.contactData?.name);
        console.error('📱 Update type:', updateType);
        console.error('📱 Messages received:', messages);
        console.error('📱 Is array?', Array.isArray(messages));
        console.error('📱 Message count:', messages?.length);
        console.error('📱 Screen visible:', this.isVisible);
        console.error('📱 Current message count:', this.messages?.length);
        
        // CRITICAL FIX: Prevent update during rendering to avoid infinite loops
        if (this.isRendering) {
            console.log('📱 ⚠️ updateMessages called during rendering, deferring...');
            setTimeout(() => this.updateMessages(messages, updateType), 10);
            return;
        }
        
        console.log('📱 🔄 SMS SCREEN updateMessages called with type:', updateType);
        console.log('📱 🔄 Received messages:', Array.isArray(messages), messages?.length);
        console.log('📱 🔄 Contact name:', this.contactData?.name);
        console.log('📱 🔄 Screen visible:', this.isVisible);
        
        // 🔧 FAILSAFE FIX: Allow failsafe updates to bypass stale cache logic
        const isFailsafeUpdate = updateType?.includes('failsafe') || updateType === 'emergency';
        
        // CRITICAL FIX: Check if this is fresh data vs stale cache (BUT allow failsafe)
        const hasFreshData = Array.isArray(messages) && messages.some(msg => msg._freshDataTimestamp || msg._failsafeForced || msg._emergencyRefresh);
        const timeSinceLastFresh = this._lastFreshUpdate ? Date.now() - this._lastFreshUpdate : 999999;
        
        // CRITICAL FIX: Be more lenient with fresh data detection - allow updates more frequently
        if (!isFailsafeUpdate && !hasFreshData && timeSinceLastFresh < 1000) { // Reduced from 2000ms to 1000ms
            console.log('📱 🚫 BLOCKING stale cache update - fresh data received recently');
            return;
        }
        
        // 🔧 FAILSAFE: Record fresh data timestamp for failsafe updates too
        if (isFailsafeUpdate || hasFreshData) {
            this._lastFreshUpdate = Date.now();
            console.log('📱 ✅ Accepting update - failsafe or fresh data detected');
        }
        
        // Critical fix: Ensure messages is always an array to prevent crashes.
        if (Array.isArray(messages)) {
            // CRITICAL DEBUG: Log current vs new message data
            const currentMessageCount = this.messages?.length || 0;
            const newMessageCount = messages.length;
            console.log(`CRITICAL DEBUG: Current messages: ${currentMessageCount}, New messages: ${newMessageCount}`);
            
            if (messages.length > 0) {
                // Show sample of new messages for debugging
                const latestMessages = messages.slice(-3);
                console.log('CRITICAL DEBUG: Latest 3 messages in update:', latestMessages.filter(m => m).map(m => ({
                    text: m.text?.substring(0, 50) || 'No text',
                    timestamp: m.timestamp,
                    type: m.type,
                    fresh: !!m._freshDataTimestamp,
                    failsafe: !!m._failsafeForced
                })));
            }
            
            // CRITICAL FIX: Force complete refresh - clear old data first
            this.messages = [];
            
            // CRITICAL FIX: Sort messages by timestamp to ensure newest are at bottom
            this.messages = [...messages].sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return timeA - timeB; // Oldest first, newest last (at bottom)
            });
            console.log(`📱 ✅ Updated and sorted ${messages.length} messages for ${this.contactData.name}`);
            if (messages.length > 0) {
                console.log(`📱 🔄 Sample messages:`, this.messages.slice(-2)); // Show last 2 messages
            }
        } else {
            this.messages = [];
            console.log(`📱 ⚠️ Received non-array for messages for ${this.contactData.name}. Defaulting to empty. Received:`, messages);
        }
        
        console.log('📱 🔄 About to call scrollToBottom');
        
        // CRITICAL FIX: Force scroll to bottom with delay to ensure proper calculation
        setTimeout(() => {
            this.scrollToBottom();
            console.log(`📱 📍 Scroll forced to bottom: offset=${this.scrollOffset}, max=${this.maxScrollOffset}`);
        }, 50);
        
        console.log('📱 🔄 About to call renderInterface with type:', updateType);
        
        // CRITICAL FIX: Use proper update type for throttling (failsafe always gets priority)
        const renderUpdateType = isFailsafeUpdate || updateType === 'critical' || updateType === 'incoming_message' || updateType === 'message_sent' 
            ? 'critical' 
            : 'background';
        
        this.renderInterface(true, renderUpdateType); // Use proper priority based on update type
        console.log('📱 ✅ updateMessages completed');
        
        // CRITICAL FIX: Add self-healing check - if no messages after update, force refresh
        if (this.messages.length === 0 && Array.isArray(messages) && messages.length > 0) {
            console.error('🚨 CRITICAL: Messages were provided but screen has no messages - forcing immediate refresh');
            this.messages = [...messages]; // Force copy the messages
            setTimeout(() => {
                this.renderInterface(true, 'critical');
            }, 100);
        }
    }
    
    /**
     * EMERGENCY: Force load messages bypassing all caching and throttling
     */
    forceLoadRealtimeMessages() {
        console.error('🚨 EMERGENCY: forceLoadRealtimeMessages called for contact', this.contactData?.id);
        
        // Clear any existing message state
        this.messages = [];
        this._lastFreshUpdate = 0;
        
        // Force fresh conversation fetch
        if (window.app?.smsIntegrationManager) {
            console.error('🚨 EMERGENCY: Forcing conversation refresh');
            window.app.smsIntegrationManager.getConversation(this.contactData.id, true);
        }
        
        // Also try channel manager as backup
        if (window.app?.smsChannelManager) {
            console.error('🚨 EMERGENCY: Also trying channel manager');
            window.app.smsChannelManager.loadConversation(this.contactData.id, null, null, true);
        }
        
        // Force render after a delay
        setTimeout(() => {
            console.error('🚨 EMERGENCY: Forcing render after message fetch');
            this.renderInterface(true, 'critical');
        }, 1000);
    }

    /**
     * Force refresh messages - emergency self-healing method
     */
    forceRefreshMessages() {
        console.log('📱 🚨 EMERGENCY: Force refreshing messages for', this.contactData.name);
        
        // Clear the fresh data timestamp to allow new updates
        this._lastFreshUpdate = null;
        
        // Try multiple methods to get messages
        if (window.app?.smsIntegrationManager) {
            console.log('📱 🔧 Emergency refresh via SMS Integration Manager');
            window.app.smsIntegrationManager.getConversation(this.contactData.id, true) // Force refresh
                .then(response => {
                    if (response && response.messages) {
                        // Mark as emergency update to bypass all blocking
                        response.messages.forEach(msg => msg._emergencyRefresh = true);
                        this.updateMessages(response.messages, 'emergency');
                    }
                })
                .catch(error => {
                    console.error('📱 Emergency refresh failed:', error);
                    this.loadRealConversation(); // Fallback
                });
        } else {
            this.loadRealConversation(); // Fallback to old method
        }
    }

    /**
     * Perform periodic health check for self-healing
     */
    performHealthCheck() {
        // Only check if screen is visible
        if (!this.isVisible) return;
        
        // Check if we have recent messages
        const now = Date.now();
        const timeSinceLastUpdate = this._lastFreshUpdate ? now - this._lastFreshUpdate : 999999;
        
        // If no fresh update in last 30 seconds and we have no messages, force refresh
        if (timeSinceLastUpdate > 30000 && this.messages.length === 0) {
            console.log('📱 🔧 HEALTH CHECK: No messages and no recent updates, forcing refresh...');
            this.forceRefreshMessages();
        }
        
        // Check if we should have gotten messages by now
        if (this.messages.length === 0 && this.isVisible) {
            console.log('📱 🔧 HEALTH CHECK: Screen visible but no messages, triggering load...');
            this.loadRealConversation();
        }
    }

    /**
     * Add new message
     */
    addMessage(message) {
        // Add timestamp if not present
        if (!message.timestamp) {
            message.timestamp = new Date().toISOString();
        }
        
        this.messages.push(message);
        
        // CRITICAL FIX: Sort messages after adding to ensure proper order
        this.messages.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB; // Oldest first, newest last (at bottom)
        });
        
        // CRITICAL FIX: Force scroll to bottom after adding new message with delay
        setTimeout(() => {
            this.scrollToBottom();
            this.renderInterface(true, 'incoming_message'); // Use incoming_message for bypass
        }, 50); // Small delay to ensure rendering is complete
        
        console.log(`💬 Added message to ${this.contactData.name}, total messages: ${this.messages.length}`);
    }
    
    /**
     * Update input text
     */
    updateInputText(text) {
        console.log(`📱 [DIAG] smsScreen.updateInputText received: "${text}". Current text: "${this.currentInputText}"`);
        this.currentInputText = text || '';
        
        // Activate input state when receiving text
        if (!this.isInputActive && text) {
            this.activateInput();
        }
        
        // Reset cursor blink timing
        this.lastCursorBlink = Date.now();
        
        // Immediate visual update
        console.log('📱 [DIAG] Re-rendering interface due to text update.');
        this.renderInterface();
        
        console.log('📱 SMS screen input text updated:', this.currentInputText.length, 'characters');
    }
    
    /**
     * Load real conversation data using the central SMS Integration Manager
     */
    loadRealConversation() {
        console.log(`📱 Loading real conversation for ${this.contactData.name} (${this.contactData.id}) using Integration Manager`);

        // CRITICAL FIX: Preserve locally sent messages during refresh
        const localSentMessages = this.messages.filter(msg => msg.isLocalSent);

        if (window.app?.smsIntegrationManager) {
            window.app.smsIntegrationManager.getConversation(this.contactData.id)
                .then(messages => {
                    console.log(`📱 SMS screen received ${messages.length} messages from Integration Manager.`);
                    if (Array.isArray(messages)) {
                        const formattedMessages = messages.map(msg => ({
                            text: msg.text || '',
                            timestamp: msg.timestamp || Date.now(),
                            isOutgoing: msg.type === 'sent',
                            type: msg.type,
                            sender: msg.type === 'sent' ? 'You' : this.contactData.name
                        }));

                        // CRITICAL FIX: Merge manager messages with local sent messages
                        const allMessages = [...formattedMessages, ...localSentMessages];
                        
                        this.updateMessages(allMessages);
                        console.log(`📱 SMS screen loaded ${formattedMessages.length} manager messages + ${localSentMessages.length} local messages for ${this.contactData.name}`);
                    } else {
                         console.log(`📱 No messages found for ${this.contactData.name}, preserving ${localSentMessages.length} local messages`);
                         this.updateMessages(localSentMessages);
                    }
                })
                .catch(error => {
                    console.error(`📱 Failed to load conversation via Integration Manager for ${this.contactData.name}:`, error);
                    this.updateMessages(localSentMessages);
                });
        } else {
            console.warn('📱 smsIntegrationManager not available, cannot load conversation.');
            this.updateMessages(localSentMessages);
        }
    }
    
    /**
     * Refresh conversation data using the central SMS Integration Manager
     */
    refreshConversation() {
        console.log(`🔄 Refreshing conversation for ${this.contactData.name} (${this.contactData.id})`);
        // This is just an alias for loadRealConversation to make the intent clear
        this.loadRealConversation();
    }
    
    /**
     * Activate input state
     */
    activateInput() {
        this.isInputActive = true;
        this.lastCursorBlink = Date.now();
        console.log('📱 SMS input activated - cursor will blink');
    }
    
    /**
     * Deactivate input state
     */
    deactivateInput() {
        this.isInputActive = false;
        this.lastCursorBlink = null;
        
        // Clear cursor blink timer to prevent infinite loop
        if (this.cursorBlinkTimer) {
            clearTimeout(this.cursorBlinkTimer);
            this.cursorBlinkTimer = null;
        }
        
        console.log('📱 SMS input deactivated');
    }
    
    /**
     * Send current input message
     */
    sendCurrentMessage() {
        // This function is now a simple wrapper around the robust sendMessage method.
        console.log('📱 [DIAG] sendCurrentMessage called, forwarding to sendMessage.');
        this.sendMessage();
    }
    
    /**
     * Scroll the message content
     */
    scroll(delta) {
        // Ensure numeric values to prevent NaN
        if (typeof delta !== 'number' || isNaN(delta)) {
            console.warn('📱 Invalid scroll delta:', delta);
            return;
        }
        
        // Ensure scrollOffset is a valid number
        if (typeof this.scrollOffset !== 'number' || isNaN(this.scrollOffset)) {
            console.warn('📱 Invalid scrollOffset, resetting to 0');
            this.scrollOffset = 0;
        }
        
        // Ensure maxScrollOffset is a valid number
        if (typeof this.maxScrollOffset !== 'number' || isNaN(this.maxScrollOffset)) {
            console.warn('📱 Invalid maxScrollOffset, recalculating bounds');
            const headerHeight = 240;
            const inputHeight = 100;
            const messageAreaHeight = this.canvasHeight - headerHeight - inputHeight;
            this.calculateScrollBounds(this.ctx, messageAreaHeight);
        }

        // FIX: The interaction manager sends an inverted delta. A downward drag (positive dy)
        // should increase the scroll offset, but the manager sends -dy. We correct it here.
        const correctedDelta = -delta;

        this.scrollOffset += correctedDelta;
        
        // Clamp scroll offset
        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.maxScrollOffset));
        
        console.log(`📱 Scrolling: delta=${delta}, corrected=${correctedDelta}, newOffset=${this.scrollOffset}, max=${this.maxScrollOffset}`);
        
        // Re-render with scroll throttling to prevent excessive rendering
        this.renderInterface(true, 'scroll');
    }
    
    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        // To scroll to the bottom, we first need to calculate the maximum scroll offset.
        const headerHeight = 240;
        const inputHeight = 100;
        const messageAreaHeight = this.canvasHeight - headerHeight - inputHeight;
        
        // CRITICAL FIX: Ensure canvas context is available
        if (!this.ctx) {
            console.warn('📱 No canvas context available for scrollToBottom');
            return;
        }
        
        this.calculateScrollBounds(this.ctx, messageAreaHeight);
        
        // CRITICAL FIX: Ensure maxScrollOffset is valid before setting scroll position
        if (typeof this.maxScrollOffset !== 'number' || isNaN(this.maxScrollOffset)) {
            console.warn('📱 Invalid maxScrollOffset in scrollToBottom, setting to 0');
            this.maxScrollOffset = 0;
        }
        
        // Now that maxScrollOffset is updated, set the current scroll offset to it.
        this.scrollOffset = this.maxScrollOffset;
        
        // CRITICAL FIX: Force immediate re-render to show scroll position
        this.renderInterface(true, 'scroll'); // Smart throttling for scroll updates
        console.log(`📱 Scrolled to bottom, new offset: ${this.scrollOffset}, max: ${this.maxScrollOffset}`);
    }
    
    /**
     * Handle screen interaction
     */
    handleClick(intersectionPoint) {
        // Convert 3D intersection to 2D canvas coordinates
        // Normalize intersection point to canvas coordinates
        const canvasX = (intersectionPoint.x + 0.5) * this.canvasWidth;
        const canvasY = (1 - (intersectionPoint.y + 0.5)) * this.canvasHeight;
        
        console.log(`SMS screen clicked at canvas coordinates: ${canvasX}, ${canvasY}`);
        
        // Check if click is in input area
        const inputHeight = 100;
        const inputY = this.canvasHeight - inputHeight;
        
        if (canvasY >= inputY && canvasY <= this.canvasHeight) {
            // Check if clicking on input field specifically
            const inputFieldHeight = 40;
            const inputFieldY = inputY + 20;
            const inputFieldX = 20;
            const inputFieldWidth = this.canvasWidth - 120;
            
            if (canvasX >= inputFieldX && canvasX <= inputFieldX + inputFieldWidth &&
                canvasY >= inputFieldY && canvasY <= inputFieldY + inputFieldHeight) {
                
                console.log('📱 Input field tapped - requesting Flutter keyboard');
                
                // Activate input visual state immediately
                this.activateInput();
                this.renderInterface();
                
                // Request Flutter keyboard
                if (window.flutter_inappwebview) {
                    window.flutter_inappwebview.callHandler('showSmsKeyboard', {
                        contactPhone: this.contactData.phoneNumber,
                        contactName: this.contactData.name,
                        currentText: this.currentInputText || ''
                    });
                }
                
                // Also notify SMS integration manager
                if (window.app && window.app.smsIntegrationManager) {
                    window.app.smsIntegrationManager.onInputFocused && 
                        window.app.smsIntegrationManager.onInputFocused(this.contactData.phoneNumber);
                }
            }
            
            // Check if clicking on send button
            const sendButtonX = this.canvasWidth - 80;
            const sendButtonY = inputFieldY;
            const sendButtonWidth = 60;
            const sendButtonHeight = inputFieldHeight;
            
            if (canvasX >= sendButtonX && canvasX <= sendButtonX + sendButtonWidth &&
                canvasY >= sendButtonY && canvasY <= sendButtonY + sendButtonHeight &&
                this.currentInputText && this.currentInputText.trim()) {
                
                console.log('📤 Send button tapped');
                this.sendMessage();
            }
        }
        
        // Check if click is on close button
        const closeButtonSize = 140; // 3x larger (70 * 2)
        const closeButtonX = this.canvasWidth - closeButtonSize;
        const closeButtonY = 0;
        
        if (canvasX >= closeButtonX && canvasX <= this.canvasWidth &&
            canvasY >= closeButtonY && canvasY <= closeButtonSize) {
            
            console.log('❌ Close button tapped');
            this.close();
        }
    }
    
    /**
     * Send message
     */
    sendMessage() {
        if (!this.currentInputText || !this.currentInputText.trim()) {
            return;
        }

        const messageText = this.currentInputText.trim();
        
        // Get the authoritative contact data from the ContactManager
        const contact = window.app.contactManager.getContactById(this.contactData.id);
        if (!contact) {
            console.error(`� ❌ Cannot send SMS. Contact not found in ContactManager: ${this.contactData.id}`);
            return;
        }

        const phoneNumber = contact.contactData.phoneNumber;
        const contactName = contact.contactData.name;

        // Validate the phone number before sending
        if (!phoneNumber || phoneNumber === 'Unknown' || !/^\d{10,}$/.test(phoneNumber.replace(/\D/g, ''))) {
            console.error(`📱 ❌ Cannot send SMS. Invalid or missing phone number for ${contactName}:`, phoneNumber);
            // Optionally, show an error to the user on the screen
            this.addMessage({
                text: `Cannot send. Invalid phone number: ${phoneNumber}`,
                isOutgoing: false, // System message
                sender: 'system',
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log(`📤 Sending SMS: "${messageText}" to ${contactName} (${phoneNumber})`);

        // CRITICAL FIX: Add message immediately with unique ID for tracking
        const sentMessage = {
            text: messageText,
            isOutgoing: true,
            type: 'sent', // Ensure correct type for consistency
            timestamp: new Date().toISOString(),
            messageId: `local_sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isLocalSent: true // Flag to identify locally sent messages
        };
        
        this.addMessage(sentMessage);

        // Clear input immediately after adding message
        this.currentInputText = '';
        this.renderInterface();

        // Use the contact ID to send the message
        if (window.app?.smsIntegrationManager) {
            console.log(`📱 🔍 Sending via SMS Integration Manager to contactId: ${this.contactData.id} (resolved phoneNumber: ${phoneNumber})`);
            window.app.smsIntegrationManager.sendMessage(this.contactData.id, messageText);
        } else if (window.app?.smsChannelManager) {
            // Fallback: Use SMS Channel Manager directly
            console.log(`📱 🔍 Sending via SMS Channel Manager to resolved phoneNumber: ${phoneNumber}`);
            window.app.smsChannelManager.sendSmsMessage(phoneNumber, messageText, (response) => {
                console.log(`📱 SMS Screen send response:`, response);
                
                // ENHANCEMENT: Update message status when response received
                if (response.success) {
                    // Mark local message as successfully sent
                    const messageIndex = this.messages.findIndex(m => m.messageId === sentMessage.messageId);
                    if (messageIndex !== -1) {
                        this.messages[messageIndex].deliveryStatus = 'sent';
                        this.renderInterface();
                    }
                } else {
                    // Mark message as failed
                    const messageIndex = this.messages.findIndex(m => m.messageId === sentMessage.messageId);
                    if (messageIndex !== -1) {
                        this.messages[messageIndex].deliveryStatus = 'failed';
                        this.messages[messageIndex].text += ' (Failed to send)';
                        this.renderInterface();
                    }
                }
            });
        } else {
            console.error('📱 ❌ No SMS manager available for sending message');
            return;
        }

        // Notify SMS integration manager
        if (window.app && window.app.smsIntegrationManager) {
            window.app.smsIntegrationManager.onMessageSent(this.contactData.phoneNumber, messageText);
        }
    }
    
    /**
     * Close SMS screen
     */
    close() {
        console.log('🔒 Closing SMS screen');
        
        // Hide keyboard if open - Use correct Flutter channel method
        if (window.HideSmsKeyboard) {
            console.log('📤 [JavaScript] Calling Flutter HideSmsKeyboard channel');
            window.HideSmsKeyboard.postMessage('hide');
        } else {
            console.warn('⚠️ [JavaScript] HideSmsKeyboard channel not available');
        }
        
        // CRITICAL: Exit SMS interaction mode first to restore camera controls
        if (window.app && window.app.smsInteractionManager) {
            console.log('🎯 Exiting SMS interaction mode from screen close');
            window.app.smsInteractionManager.exitSmsMode();
        }
        
        // Notify SMS integration manager
        if (window.app && window.app.smsIntegrationManager) {
            window.app.smsIntegrationManager.onScreenClosed(this.contactData.phoneNumber);
        }
        
        // Hide screen
        this.hide();
    }

    /**
     * Hide SMS screen from view
     */
    hide() {
        console.log('📱 Hiding SMS screen');
        this.isVisible = false;
        if (this.mesh) {
            this.mesh.visible = false;
        }
        if (this.interactionOverlay) {
            this.interactionOverlay.visible = false;
        }
    }

    /**
     * Show SMS screen
     */
    show() {
        console.log('📱 Showing SMS screen');
        this.isVisible = true;
        if (this.mesh) {
            this.mesh.visible = true;
        }
        if (this.interactionOverlay) {
            this.interactionOverlay.visible = true;
        }
    }

    /**
     * Dispose screen
     */
    dispose() {
        // Clear health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        // 🔥 SIMPLIFIED: Unregister from Simple Core
        if (window.smsSimpleCore) {
            window.smsSimpleCore.unregisterSmsScreen(this.contactData.id);
        }
        
        // Remove event listeners to prevent memory leaks
        window.removeEventListener('sms-text-input', this.handleSmsTextInput);
        window.removeEventListener('sms-emergency-update', this.handleEmergencyUpdate);

        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        
        if (this.canvas) {
            this.canvas = null;
        }
        
        console.log(`🗑️ SMS screen disposed for ${this.contactData.name}`);
    }
}
