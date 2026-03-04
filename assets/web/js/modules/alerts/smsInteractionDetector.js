/**
 * SMS Interaction Detector
 * 
 * Detects when users enter interactive mode with SMS screens to clear alerts.
 * Integrates with existing interaction systems without interfering with SMS functionality.
 * 
 * Features:
 * - Double-tap detection for interactive mode
 * - SMS screen interaction monitoring
 * - Non-intrusive event observation
 * - Compatible with existing interaction manager
 */

class SmsInteractionDetector {
    constructor() {
        this.debugMode = false;
        this.isInitialized = false;
        
        // Interaction tracking
        this.tapCounts = new Map(); // contactId -> { count, lastTap }
        this.doubleTapDelay = 300; // ms between taps for double-tap
        
        // SMS screen state tracking
        this.activeSmsScreens = new Map(); // contactId -> screenData
        
        console.log('👆 SmsInteractionDetector: Initializing interaction monitoring...');
        this.initialize();
    }

    /**
     * Initialize the interaction detector
     */
    initialize() {
        try {
            // Set up interaction event listeners
            this.setupInteractionListeners();
            
            // Set up SMS screen monitoring
            this.setupSmsScreenMonitoring();
            
            this.isInitialized = true;
            console.log('👆 ✅ SmsInteractionDetector: Initialization complete');
            
            // Global access
            window.smsInteractionDetector = this;
            
        } catch (error) {
            console.error('👆 ❌ SmsInteractionDetector initialization failed:', error);
        }
    }

    /**
     * Set up interaction event listeners
     */
    setupInteractionListeners() {
        try {
            // Listen for contact tap events
            window.addEventListener('contact-tapped', (event) => {
                const { contactId, tapCount, event: originalEvent } = event.detail || {};
                this.handleContactTap(contactId, tapCount, originalEvent);
            });

            // Listen for SMS screen tap events
            window.addEventListener('sms-screen-tapped', (event) => {
                const { contactId, tapCount, interactive } = event.detail || {};
                this.handleSmsScreenTap(contactId, tapCount, interactive);
            });

            // Listen for double-tap events specifically
            window.addEventListener('contact-double-tapped', (event) => {
                const { contactId } = event.detail || {};
                this.handleDoubleTap(contactId);
            });

            console.log('👆 Interaction event listeners established');
            
        } catch (error) {
            console.error('👆 Error setting up interaction listeners:', error);
        }
    }

    /**
     * Set up SMS screen monitoring
     */
    setupSmsScreenMonitoring() {
        try {
            // Monitor SMS screen visibility changes
            window.addEventListener('sms-screen-visibility-changed', (event) => {
                const { contactId, visible, interactive } = event.detail || {};
                this.handleSmsScreenVisibility(contactId, visible, interactive);
            });

            // Monitor SMS screen state changes
            window.addEventListener('sms-screen-state-changed', (event) => {
                const { contactId, state, interactive } = event.detail || {};
                this.handleSmsScreenStateChange(contactId, state, interactive);
            });

            console.log('👆 SMS screen monitoring established');
            
        } catch (error) {
            console.error('👆 Error setting up SMS screen monitoring:', error);
        }
    }

    /**
     * Handle contact tap events
     */
    handleContactTap(contactId, tapCount, originalEvent) {
        try {
            if (!contactId) return;

            const now = Date.now();
            const tapData = this.tapCounts.get(contactId) || { count: 0, lastTap: 0 };

            // Check if this is part of a double-tap sequence
            if (now - tapData.lastTap < this.doubleTapDelay) {
                tapData.count++;
            } else {
                tapData.count = 1;
            }

            tapData.lastTap = now;
            this.tapCounts.set(contactId, tapData);

            // Detect double-tap
            if (tapData.count >= 2) {
                this.handleDoubleTap(contactId);
                // Reset tap count
                this.tapCounts.delete(contactId);
            }

            if (this.debugMode) {
                console.log(`👆 Contact tap: ${contactId}, count: ${tapData.count}`);
            }
            
        } catch (error) {
            console.error('👆 Error handling contact tap:', error);
        }
    }

    /**
     * Handle SMS screen tap events
     */
    handleSmsScreenTap(contactId, tapCount, interactive) {
        try {
            if (!contactId) return;

            // If already in interactive mode, any tap is engagement
            if (interactive) {
                this.handleInteractiveEngagement(contactId, 'sms-screen-tap');
            }

            if (this.debugMode) {
                console.log(`👆 SMS screen tap: ${contactId}, interactive: ${interactive}`);
            }
            
        } catch (error) {
            console.error('👆 Error handling SMS screen tap:', error);
        }
    }

    /**
     * Handle double-tap detection
     */
    handleDoubleTap(contactId) {
        try {
            if (!contactId) return;

            console.log(`👆 🔔 Double-tap detected for contact ${contactId} - entering interactive mode`);

            // Check if SMS screen is visible for this contact
            const smsScreenData = this.activeSmsScreens.get(contactId);
            if (smsScreenData) {
                // SMS screen is open, double-tap means interactive engagement
                this.handleInteractiveEngagement(contactId, 'double-tap');
            } else {
                // SMS screen not open, double-tap will open it in interactive mode
                // Listen for the screen to open and then trigger interactive mode
                this.waitForSmsScreenOpen(contactId);
            }
            
        } catch (error) {
            console.error('👆 Error handling double-tap:', error);
        }
    }

    /**
     * Wait for SMS screen to open after double-tap
     */
    waitForSmsScreenOpen(contactId) {
        try {
            let attempts = 0;
            const maxAttempts = 10;
            const checkInterval = 100; // ms

            const checkForScreen = () => {
                attempts++;
                
                // Check if SMS screen is now open
                const smsScreenData = this.activeSmsScreens.get(contactId);
                if (smsScreenData && smsScreenData.visible) {
                    // Screen opened, trigger interactive mode
                    setTimeout(() => {
                        this.handleInteractiveEngagement(contactId, 'double-tap-screen-opened');
                    }, 50); // Small delay to ensure screen is ready
                    return;
                }

                // Continue checking if we haven't exceeded max attempts
                if (attempts < maxAttempts) {
                    setTimeout(checkForScreen, checkInterval);
                } else if (this.debugMode) {
                    console.log(`👆 SMS screen open timeout for contact ${contactId}`);
                }
            };

            checkForScreen();
            
        } catch (error) {
            console.error('👆 Error waiting for SMS screen open:', error);
        }
    }

    /**
     * Handle SMS screen visibility changes
     */
    handleSmsScreenVisibility(contactId, visible, interactive) {
        try {
            if (!contactId) return;

            if (visible) {
                // SMS screen opened
                const screenData = {
                    visible: true,
                    interactive: interactive || false,
                    openedAt: Date.now()
                };
                
                this.activeSmsScreens.set(contactId, screenData);

                if (interactive) {
                    this.handleInteractiveEngagement(contactId, 'screen-opened-interactive');
                }
            } else {
                // SMS screen closed
                this.activeSmsScreens.delete(contactId);
            }

            if (this.debugMode) {
                console.log(`👆 SMS screen visibility: ${contactId}, visible: ${visible}, interactive: ${interactive}`);
            }
            
        } catch (error) {
            console.error('👆 Error handling SMS screen visibility:', error);
        }
    }

    /**
     * Handle SMS screen state changes
     */
    handleSmsScreenStateChange(contactId, state, interactive) {
        try {
            if (!contactId) return;

            const screenData = this.activeSmsScreens.get(contactId);
            if (screenData) {
                screenData.interactive = interactive || false;
                screenData.state = state;
                this.activeSmsScreens.set(contactId, screenData);

                if (interactive) {
                    this.handleInteractiveEngagement(contactId, 'state-change-interactive');
                }
            }

            if (this.debugMode) {
                console.log(`👆 SMS screen state change: ${contactId}, state: ${state}, interactive: ${interactive}`);
            }
            
        } catch (error) {
            console.error('👆 Error handling SMS screen state change:', error);
        }
    }

    /**
     * Handle interactive engagement (clear alerts)
     */
    handleInteractiveEngagement(contactId, reason) {
        try {
            console.log(`👆 📱 Interactive engagement detected for contact ${contactId} (${reason})`);

            // Dispatch event to clear SMS alerts
            window.dispatchEvent(new CustomEvent('sms-screen-interactive-mode', {
                detail: {
                    contactId: contactId,
                    reason: reason,
                    timestamp: Date.now()
                }
            }));
            
        } catch (error) {
            console.error('👆 Error handling interactive engagement:', error);
        }
    }

    /**
     * Manually trigger interactive mode (for testing)
     */
    triggerInteractiveMode(contactId, reason = 'manual') {
        this.handleInteractiveEngagement(contactId, reason);
    }

    /**
     * Get active SMS screens
     */
    getActiveSmsScreens() {
        return Array.from(this.activeSmsScreens.entries()).map(([contactId, screenData]) => ({
            contactId,
            ...screenData
        }));
    }

    /**
     * Check if contact has active SMS screen
     */
    hasActiveSmsScreen(contactId) {
        const screenData = this.activeSmsScreens.get(contactId);
        return screenData && screenData.visible;
    }

    /**
     * Check if contact SMS screen is in interactive mode
     */
    isInInteractiveMode(contactId) {
        const screenData = this.activeSmsScreens.get(contactId);
        return screenData && screenData.visible && screenData.interactive;
    }

    /**
     * Clear tap tracking for contact
     */
    clearTapTracking(contactId) {
        this.tapCounts.delete(contactId);
    }

    /**
     * Clear all tap tracking
     */
    clearAllTapTracking() {
        this.tapCounts.clear();
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this.debugMode = true;
        console.log('👆 Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.debugMode = false;
        console.log('👆 Debug mode disabled');
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            initialized: this.isInitialized,
            activeSmsScreens: this.getActiveSmsScreens(),
            tapTracking: Array.from(this.tapCounts.entries()),
            doubleTapDelay: this.doubleTapDelay
        };
    }
}

// Global functions for debugging
window.debugSmsInteractions = () => {
    if (window.smsInteractionDetector) {
        console.log('👆 SMS INTERACTION DEBUG INFO:');
        console.log(window.smsInteractionDetector.getDebugInfo());
    } else {
        console.log('👆 SmsInteractionDetector not initialized');
    }
};

window.triggerTestInteraction = (contactId) => {
    if (window.smsInteractionDetector) {
        window.smsInteractionDetector.triggerInteractiveMode(contactId, 'test');
        console.log(`👆 Test interaction triggered for contact ${contactId}`);
    }
};

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsInteractionDetector;
}
