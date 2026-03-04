/**
 * @file smsInputManager.js
 * @description Manages SMS text input functionality including keyboard activation,
 * text handling, and input UI rendering. Extracted from smsIntegrationManager.js
 * for better modularity and maintainability.
 */

class SmsInputManager {
    constructor() {
        // --- Input Management ---
        this.textInputBuffer = '';
        this.renderInputActive = false;
        this.lastRenderState = null; // For render optimization
        this.textMonitoringInterval = null; // For real-time text updates
        
        // --- Callback Functions ---
        this.onInputTextUpdated = null; // Callback when text is updated
        this.onSendButtonPressed = null; // Callback when send button is pressed
        
        console.log("✅ SMS Input Manager instantiated.");
    }

    /**
     * Set the current contact ID for SMS conversation
     * @param {string} contactId - The contact ID
     */
    setCurrentContact(contactId) {
        this.currentContactId = contactId;
        console.log(`📱 Input manager current contact set to: ${contactId}`);
    }

    /**
     * Activate the SMS input area
     */
    activateInput() {
        console.log("📱 Activating SMS input area");
        this.renderInputActive = true;
        this.textInputBuffer = '';
        this.renderInputArea();
        
        // Request optimal camera positioning for SMS viewing
        if (this.currentContactId) {
            this.requestOptimalCameraPosition(this.currentContactId);
        }
        
        // Request keyboard focus
        this.requestKeyboardFromFlutter();
    }

    /**
     * Deactivate the SMS input area  
     */
    deactivateInput() {
        console.log("📱 Deactivating SMS input area");
        this.renderInputActive = false;
        this.textInputBuffer = '';
        
        // PHASE 1: Deactivate the text input bridge
        if (window.smsTextInputBridge) {
            console.log("📱 Deactivating text input bridge");
            window.smsTextInputBridge.deactivate();
        }
        
        // PHASE 2: Clean up ALL hidden input elements (in case of duplicates)
        const hiddenInputs = document.querySelectorAll('#sms-hidden-input, input[id*="sms-hidden"], input[aria-hidden="true"]');
        hiddenInputs.forEach((input, index) => {
            console.log(`🛠️ [DEBUG] Removing hidden input element #${index + 1}`);
            input.remove();
        });
        
        // Additional cleanup - remove any lingering input elements that might be hidden
        const allInputs = document.querySelectorAll('input[type="text"]');
        allInputs.forEach(input => {
            const style = window.getComputedStyle(input);
            if (style.position === 'fixed' && 
                (style.left === '-10000px' || parseInt(style.left) < -1000) && 
                (style.visibility === 'hidden' || style.opacity === '0')) {
                console.log(`🛠️ [DEBUG] Removing orphaned hidden input element`);
                input.remove();
            }
        });
        
        // Clear overlay and disable pointer events
        const overlay2d = document.getElementById('sms-input-overlay');
        if (overlay2d) {
            const ctx = overlay2d.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, overlay2d.width, overlay2d.height);
            }
            // Disable pointer events to restore camera controls
            overlay2d.style.pointerEvents = 'none';
        }
    }

    /**
     * Handles optimized text input received from the Flutter channel.
     * PERFORMANCE OPTIMIZATION: Now receives complete messages instead of character-by-character updates
     * @param {string} text - The complete message text typed by the user.
     */
    handleChannelTextInput(text) {
        console.log(`📝 OPTIMIZED INPUT: Complete message received: "${text}"`);
        this.textInputBuffer = text;
        this.renderInputArea(); // Re-render to display the complete message
        
        // Notify parent via callback
        if (this.onInputTextUpdated) {
            this.onInputTextUpdated(text);
        }
    }

    /**
     * Set callback for when input text is updated
     * @param {function} callback - Callback function(text)
     */
    setOnInputTextUpdated(callback) {
        this.onInputTextUpdated = callback;
    }

    /**
     * Set callback for when send button is pressed
     * @param {function} callback - Callback function(text)
     */
    setOnSendButtonPressed(callback) {
        this.onSendButtonPressed = callback;
    }

    /**
     * Get current input text
     * @returns {string} Current text in buffer
     */
    getCurrentText() {
        return this.textInputBuffer;
    }

    /**
     * Set input text programmatically
     * @param {string} text - Text to set
     */
    setInputText(text) {
        this.textInputBuffer = text;
        this.renderInputArea();
    }

    /**
     * Clear input text
     */
    clearInput() {
        this.textInputBuffer = '';
        this.renderInputArea();
    }

    /**
     * Check if input is currently active
     * @returns {boolean} True if input is active
     */
    isInputActive() {
        return this.renderInputActive;
    }

    /**
     * Sends a request to Flutter to show the native keyboard.
     * @param {string} currentContactId - The current contact ID for context
     */
    requestKeyboardFromFlutter(currentContactId = null) {
        console.log("📲 Sending 'showKeyboard' request to Flutter...");
        
        // === ENHANCED DEBUGGING FOR KEYBOARD ISSUES ===
        console.log("🛠️ [DEBUG] Keyboard request diagnostics:");
        console.log("🛠️ [DEBUG] - window.SmsInputChannel available:", !!window.SmsInputChannel);
        console.log("🛠️ [DEBUG] - Current contact ID:", currentContactId);
        console.log("🛠️ [DEBUG] - Render input active:", this.renderInputActive);
        
        // Check if we're in a WebView
        console.log("🛠️ [DEBUG] - User agent:", navigator.userAgent);
        console.log("🛠️ [DEBUG] - Is WebView (contains 'wv'):", navigator.userAgent.includes('wv'));
        
        // --- FLUTTER INTEGRATION POINT ---
        // Use the existing SMS Input Channel that's already working
        if (window.SmsInputChannel) {
            try {
                const keyboardRequest = {
                    action: "show_keyboard",
                    contactId: currentContactId || "unknown", 
                    inputType: "sms",
                    timestamp: Date.now(),
                    debug: true // Add debug flag
                };
                
                console.log("📲 Sending keyboard request:", keyboardRequest);
                window.SmsInputChannel.postMessage(JSON.stringify(keyboardRequest));
                
                // === ALTERNATIVE KEYBOARD APPROACHES ===
                
                // Try alternative method 1: Direct focus on a hidden input
                setTimeout(() => {
                    console.log("🛠️ [DEBUG] Trying alternative keyboard activation methods...");
                    this.tryAlternativeKeyboardMethods();
                }, 100);
                
                // Start the event-driven monitoring instead of polling
                this.setupRealTimeTextMonitoring();
                
            } catch (error) {
                console.error("❌ Failed to request keyboard:", error);
                console.log("🛠️ [DEBUG] Trying fallback keyboard methods due to error...");
                this.tryAlternativeKeyboardMethods();
            }
        } else {
            console.error("❌ SMS Input Channel not available");
            console.log("🛠️ [DEBUG] Trying fallback keyboard methods...");
            this.tryAlternativeKeyboardMethods();
        }
    }

    /**
     * Set up event-driven text monitoring for Flutter keyboard input
     * Flutter will send text updates via flutter-text-input events when user types
     */
    setupRealTimeTextMonitoring() {
        console.log("📱 Setting up event-driven text monitoring for Flutter keyboard");
        
        // Clear any existing polling intervals
        if (this.textMonitoringInterval) {
            clearInterval(this.textMonitoringInterval);
            this.textMonitoringInterval = null;
        }
        
        // Set up a simple validation check every 5 seconds instead of constant polling
        this.textMonitoringInterval = setInterval(() => {
            if (!this.renderInputActive) {
                // Stop monitoring if input is no longer active
                clearInterval(this.textMonitoringInterval);
                this.textMonitoringInterval = null;
                console.log("📱 Stopped text monitoring - input no longer active");
                return;
            }
            
            // Just log status every 5 seconds instead of constant requests
            console.log("📱 Text input monitoring active, waiting for Flutter text events");
        }, 5000);
        
        console.log("📱 Event-driven text monitoring active - waiting for flutter-text-input events");
    }

    /**
     * Try alternative methods to show keyboard when Flutter channel fails
     */
    tryAlternativeKeyboardMethods() {
        console.log("🛠️ [DEBUG] Attempting alternative keyboard activation methods...");
        
        // Method 1: Create and focus a hidden input element (absolutely invisible)
        try {
            let hiddenInput = document.getElementById('sms-hidden-input');
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.id = 'sms-hidden-input';
                hiddenInput.type = 'text';
                
                // ABSOLUTELY INVISIBLE - comprehensive hiding approach
                hiddenInput.style.position = 'absolute';
                hiddenInput.style.left = '-9999px';
                hiddenInput.style.top = '-9999px';
                hiddenInput.style.width = '0px';
                hiddenInput.style.height = '0px';
                hiddenInput.style.opacity = '0';
                hiddenInput.style.zIndex = '-999999';
                hiddenInput.style.pointerEvents = 'none';
                hiddenInput.style.border = 'none';
                hiddenInput.style.outline = 'none';
                hiddenInput.style.background = 'transparent';
                hiddenInput.style.visibility = 'hidden';
                hiddenInput.style.display = 'none'; // Start hidden
                hiddenInput.style.fontSize = '0px';
                hiddenInput.style.lineHeight = '0px';
                hiddenInput.style.padding = '0px';
                hiddenInput.style.margin = '0px';
                hiddenInput.style.clip = 'rect(0px, 0px, 0px, 0px)';
                hiddenInput.style.clipPath = 'inset(100%)';
                hiddenInput.style.whiteSpace = 'nowrap';
                hiddenInput.style.overflow = 'hidden';
                hiddenInput.style.color = 'transparent';
                hiddenInput.style.backgroundColor = 'transparent';
                hiddenInput.style.textShadow = 'none';
                hiddenInput.style.boxShadow = 'none';
                hiddenInput.setAttribute('tabindex', '-1');
                hiddenInput.setAttribute('aria-hidden', 'true');
                hiddenInput.setAttribute('autocomplete', 'off');
                hiddenInput.setAttribute('readonly', true);
                
                document.body.appendChild(hiddenInput);
                
                // Listen for input events on this hidden element
                hiddenInput.addEventListener('input', (event) => {
                    console.log("🛠️ [DEBUG] Hidden input received text:", event.target.value);
                    this.handleChannelTextInput(event.target.value);
                });
                
                console.log("🛠️ [DEBUG] Created absolutely hidden input element for keyboard fallback");
            } else {
                // Ensure existing hidden input is still absolutely invisible
                hiddenInput.style.display = 'none';
                hiddenInput.style.visibility = 'hidden';
                hiddenInput.style.opacity = '0';
                hiddenInput.style.left = '-9999px';
                hiddenInput.style.top = '-9999px';
                hiddenInput.style.zIndex = '-999999';
                hiddenInput.style.position = 'absolute';
            }
            
            // Temporarily show for focus, then immediately hide
            hiddenInput.style.display = 'block';
            hiddenInput.style.visibility = 'visible';
            hiddenInput.focus();
            // Immediately hide again
            setTimeout(() => {
                hiddenInput.style.display = 'none';
                hiddenInput.style.visibility = 'hidden';
            }, 10);
            console.log("🛠️ [DEBUG] Focused hidden input element (briefly visible for focus)");
            
        } catch (error) {
            console.error("🛠️ [DEBUG] Failed to create/focus hidden input:", error);
        }
        
        // Method 2: Try to trigger touch events that might activate keyboard
        try {
            const overlay = document.getElementById('sms-input-overlay');
            if (overlay) {
                overlay.focus();
                console.log("🛠️ [DEBUG] Focused overlay canvas");
            }
        } catch (error) {
            console.error("🛠️ [DEBUG] Failed to focus overlay:", error);
        }
        
        // Method 3: Try dispatching custom events that Flutter might be listening for
        try {
            const customEvent = new CustomEvent('request-keyboard', {
                detail: {
                    inputType: 'sms',
                    source: 'smsInputManager'
                }
            });
            window.dispatchEvent(customEvent);
            console.log("🛠️ [DEBUG] Dispatched custom request-keyboard event");
        } catch (error) {
            console.error("🛠️ [DEBUG] Failed to dispatch custom keyboard event:", error);
        }
    }

    /**
     * Renders the text input area on the canvas.
     * This function handles the visual overlay that maximizes SMS screen visibility.
     */
    renderInputArea() {
        // Performance optimization: Track render state to prevent unnecessary re-renders
        const currentRenderState = JSON.stringify({
            active: this.renderInputActive,
            text: this.textInputBuffer
        });
        
        // Only re-render if state has actually changed
        if (this.lastRenderState === currentRenderState) {
            return; // Skip render - no changes detected
        }
        
        this.lastRenderState = currentRenderState;
        
        // Get the canvas context for rendering
        const canvas = document.getElementById('webgl-canvas') || document.querySelector('canvas');
        if (!canvas) {
            console.warn("⚠️ Canvas not found for text input rendering");
            return;
        }

        // Get or create 2D overlay context
        let overlay2d = document.getElementById('sms-input-overlay');
        if (!overlay2d) {
            overlay2d = document.createElement('canvas');
            overlay2d.id = 'sms-input-overlay';
            overlay2d.style.position = 'fixed'; // Use fixed positioning
            overlay2d.style.top = '0';
            overlay2d.style.left = '0';
            overlay2d.style.width = '100vw'; // Full viewport width
            overlay2d.style.height = '100vh'; // Full viewport height
            overlay2d.style.pointerEvents = 'none'; // Start with no pointer events - CRITICAL
            overlay2d.style.zIndex = '9999'; // Higher z-index
            overlay2d.style.backgroundColor = 'transparent';
            // Set canvas resolution to match display size
            overlay2d.width = window.innerWidth;
            overlay2d.height = window.innerHeight;
            document.body.appendChild(overlay2d); // Append to body instead of canvas parent
            
            // Add click event listener to the overlay
            overlay2d.addEventListener('click', (event) => {
                this.handleOverlayClick(event);
            });
            
            // ENHANCED: Add keyboard event listeners for direct input fallback
            overlay2d.addEventListener('keydown', (event) => {
                this.handleOverlayKeydown(event);
            });
            
            // Make canvas focusable for keyboard events
            overlay2d.setAttribute('tabindex', '0');
            // === DEBUG: Focus/Blur events on overlay ===
            overlay2d.addEventListener('focus', () => {
                console.log('🛠️ [DEBUG] Overlay canvas focused');
            });
            overlay2d.addEventListener('blur', () => {
                console.log('🛠️ [DEBUG] Overlay canvas blurred');
            });
        } else {
            // Update existing overlay dimensions if window size changed
            if (overlay2d.width !== window.innerWidth || overlay2d.height !== window.innerHeight) {
                overlay2d.width = window.innerWidth;
                overlay2d.height = window.innerHeight;
                console.log("📱 Updated overlay dimensions:", overlay2d.width, "x", overlay2d.height);
            }
        }

        // === DEBUG: If using hidden input, add focus/blur listeners ===
        const hiddenInput = document.getElementById('sms-hidden-input');
        if (hiddenInput) {
            hiddenInput.addEventListener('focus', () => {
                console.log('🛠️ [DEBUG] Hidden input focused');
            });
            hiddenInput.addEventListener('blur', () => {
                console.log('🛠️ [DEBUG] Hidden input blurred');
            });
        }

        const ctx = overlay2d.getContext('2d');
        if (!ctx) return;

        // Clear previous frame
        ctx.clearRect(0, 0, overlay2d.width, overlay2d.height);

        // CRITICAL FIX: Only activate pointer events when input is active AND showing the input box
        if (!this.renderInputActive) {
            // Input not active - disable pointer events completely to allow camera/SMS screen controls
            overlay2d.style.pointerEvents = 'none';
            return;
        }

        // Calculate input box position and size
        const canvasWidth = overlay2d.width;
        const canvasHeight = overlay2d.height;
        
        // Position input box at bottom of screen
        const inputWidth = Math.min(canvasWidth * 0.8, 600);
        const inputHeight = 60;
        const inputX = (canvasWidth - inputWidth) / 2;
        const inputY = canvasHeight - inputHeight - 20;

        // Draw input box background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'; // More opaque
        ctx.fillRect(inputX, inputY, inputWidth, inputHeight);

        // Draw input box border
        ctx.strokeStyle = this.renderInputActive ? '#007AFF' : '#CCCCCC';
        ctx.lineWidth = 3; // Thicker border
        ctx.strokeRect(inputX, inputY, inputWidth, inputHeight);

        // Add shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // Draw input text
        const inputText = this.textInputBuffer || '';
        const placeholderText = 'Type your message...';
        const displayText = inputText || placeholderText;
        
        // Reset shadow for text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = inputText ? '#000000' : '#999999';
        
        // Text positioning with padding
        const textX = inputX + 15;
        const textY = inputY + (inputHeight / 2) + 6; // Center vertically
        
        // Measure and clip text if too long
        const maxTextWidth = inputWidth - 30;
        let displayWidth = ctx.measureText(displayText).width;
        let clippedText = displayText;
        
        if (displayWidth > maxTextWidth) {
            // Truncate text to fit
            for (let i = displayText.length; i > 0; i--) {
                clippedText = displayText.substring(0, i) + '...';
                if (ctx.measureText(clippedText).width <= maxTextWidth) {
                    break;
                }
            }
        }
        
        ctx.fillText(clippedText, textX, textY);

        // Draw blinking cursor only for real text (not placeholder)
        if (inputText && this.shouldBlinkCursor()) {
            const cursorX = textX + ctx.measureText(inputText).width;
            const cursorY = inputY + 10;
            const cursorHeight = inputHeight - 20;
            
            ctx.fillStyle = '#007AFF';
            ctx.fillRect(cursorX + 2, cursorY, 2, cursorHeight);
        }

        // Draw send button if there's text
        if (inputText && inputText.trim().length > 0) {
            const buttonWidth = 60;
            const buttonHeight = 40;
            const buttonX = inputX + inputWidth - buttonWidth - 10;
            const buttonY = inputY + (inputHeight - buttonHeight) / 2;

            // Send button background
            ctx.fillStyle = '#007AFF';
            ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

            // Send button text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Send', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);
            ctx.textAlign = 'start'; // Reset text alignment
        }

        // CRITICAL FIX: Use CSS clipping to only capture clicks in the input area
        // This allows SMS screen and camera controls to work normally everywhere else
        if (this.renderInputActive) {
            // Create a clip path that only covers the input area
            const clipPath = `polygon(${inputX}px ${inputY}px, ${inputX + inputWidth}px ${inputY}px, ${inputX + inputWidth}px ${inputY + inputHeight}px, ${inputX}px ${inputY + inputHeight}px)`;
            overlay2d.style.clipPath = clipPath;
            overlay2d.style.pointerEvents = 'auto';
            console.log(`📱 Input area clip path applied: ${clipPath}`);
            // === DEBUG: Ensure overlay stays focused when input is active ===
            if (document.activeElement !== overlay2d) {
                overlay2d.focus();
                console.log('🛠️ [DEBUG] Overlay canvas re-focused during render');
            }
        } else {
            // Remove clip path and disable pointer events when not active
            overlay2d.style.clipPath = 'none';
            overlay2d.style.pointerEvents = 'none';
        }

        // Only log when render state actually changes (much less frequent)
        console.log(`🎨 SMS input render state updated - Active: ${this.renderInputActive}, Text: "${inputText}"`);
    }

    /**
     * Handle keyboard input on the SMS input overlay as fallback
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleOverlayKeydown(event) {
        if (!this.renderInputActive) return;
        
        console.log(`⌨️ Direct keyboard input: ${event.key}`);
        
        if (event.key === 'Enter') {
            // Send message on Enter
            if (this.onSendButtonPressed && this.textInputBuffer.trim()) {
                this.onSendButtonPressed(this.textInputBuffer.trim());
                this.clearInput();
            }
            event.preventDefault();
        } else if (event.key === 'Backspace') {
            // Handle backspace
            this.textInputBuffer = this.textInputBuffer.slice(0, -1);
            this.renderInputArea();
            if (this.onInputTextUpdated) {
                this.onInputTextUpdated(this.textInputBuffer);
            }
            event.preventDefault();
        } else if (event.key.length === 1) {
            // Add character to buffer
            this.textInputBuffer += event.key;
            this.renderInputArea();
            if (this.onInputTextUpdated) {
                this.onInputTextUpdated(this.textInputBuffer);
            }
            event.preventDefault();
        }
    }

    /**
     * Handle overlay click events
     * @param {MouseEvent} event - The click event
     */
    handleOverlayClick(event) {
        if (!this.renderInputActive) return;

        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Calculate input box position (same as in renderInputArea)
        const canvasWidth = event.target.width;
        const canvasHeight = event.target.height;
        const inputWidth = Math.min(canvasWidth * 0.8, 600);
        const inputHeight = 60;
        const inputX = (canvasWidth - inputWidth) / 2;
        const inputY = canvasHeight - inputHeight - 20;

        // Check if click is on send button
        const inputText = this.textInputBuffer || '';
        if (inputText && inputText.trim().length > 0) {
            const buttonWidth = 60;
            const buttonHeight = 40;
            const buttonX = inputX + inputWidth - buttonWidth - 10;
            const buttonY = inputY + (inputHeight - buttonHeight) / 2;

            if (x >= buttonX && x <= buttonX + buttonWidth && 
                y >= buttonY && y <= buttonY + buttonHeight) {
                // Send button clicked
                if (this.onSendButtonPressed) {
                    this.onSendButtonPressed(inputText.trim());
                    this.clearInput();
                }
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }

        // Check if click is in input area
        if (x >= inputX && x <= inputX + inputWidth && 
            y >= inputY && y <= inputY + inputHeight) {
            // Focus input area
            console.log("📱 Input area clicked - requesting keyboard");
            this.requestKeyboardFromFlutter();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /**
     * Check if cursor should blink (simple timer-based blinking)
     * @returns {boolean} True if cursor should be visible
     */
    shouldBlinkCursor() {
        return Math.floor(Date.now() / 500) % 2 === 0;
    }

    /**
     * Check if camera is close to a contact (for SMS view maximization)
     * @param {string} contactId - The contact ID to check distance to
     * @returns {boolean} True if camera is close enough to the contact
     */
    isCameraCloseToContact(contactId) {
        const CLOSE_DISTANCE_THRESHOLD = 15; // Same threshold used by CameraFocusManager
        const SMS_MODE_THRESHOLD = 17.0; // More lenient threshold for SMS teleport mode
        
        try {
            // Get contact object from ContactManager
            if (!window.app?.contactManager) {
                console.warn("📱 ContactManager not available for distance check");
                return false;
            }
            
            const contact = window.app.contactManager.contacts.get(contactId);
            if (!contact?.mesh) {
                console.warn("📱 Contact mesh not found for distance check:", contactId);
                return false;
            }
            
            // Get camera position
            const camera = window.app?.camera;
            if (!camera) {
                console.warn("📱 Camera not available for distance check");
                return false;
            }
            
            // Get contact world position
            const contactWorldPosition = new THREE.Vector3();
            contact.mesh.getWorldPosition(contactWorldPosition);
            
            // Calculate distance
            const distance = camera.position.distanceTo(contactWorldPosition);
            
            // Use SMS mode threshold when input is active for better view
            const threshold = this.renderInputActive ? SMS_MODE_THRESHOLD : CLOSE_DISTANCE_THRESHOLD;
            const isClose = distance < threshold;
            
            console.log(`📱 Camera distance check for ${contactId}: distance=${distance.toFixed(2)}, threshold=${threshold}, input_active=${this.renderInputActive}, close=${isClose}`);
            
            return isClose;
            
        } catch (error) {
            console.error("📱 Error checking camera distance to contact:", error);
            return false;
        }
    }

    /**
     * Set camera positioning callback for SMS view maximization
     * @param {Function} callback - Function to call for camera positioning
     */
    setCameraPositionCallback(callback) {
        this.cameraPositionCallback = callback;
    }

    /**
     * Request optimal camera positioning for SMS view
     * @param {string} contactId - The contact ID to position camera for
     */
    requestOptimalCameraPosition(contactId) {
        if (this.cameraPositionCallback) {
            console.log("📱 Requesting optimal camera position for SMS view:", contactId);
            this.cameraPositionCallback(contactId);
        }
    }
}

// Export the class
window.SmsInputManager = SmsInputManager;

console.log("🏁 smsInputManager.js loaded.");
