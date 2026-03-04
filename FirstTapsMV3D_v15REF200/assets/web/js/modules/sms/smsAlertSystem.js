/**
 * SMS Alert System - Isolated Notification & Alert Management
 * 
 * PURPOSE: Handle ONLY visual/audio alerts for SMS events
 * SCOPE: Contact alerts, sound notifications, visual indicators
 * GOAL: Experimental alert features without breaking core SMS functionality
 * 
 * ISOLATION: Completely separate from message display system
 * - Can be disabled/modified without affecting SMS send/receive
 * - Uses its own event listeners and processing
 * - No dependencies on SMS screen rendering
 */

(function() {
    'use strict';

    class SmsAlertSystem {
        constructor() {
            this.alertEnabled = true;
            this.soundEnabled = true;
            this.visualEnabled = true;
            
            this.activeAlerts = new Map(); // contactId -> alert state
            this.alertHistory = []; // Recent alerts for debugging
            
            console.log('🚨 SMS Alert System initialized - experimental features isolated');
            this.setupAlertListeners();
        }

        /**
         * Setup alert-specific event listeners
         */
        setupAlertListeners() {
            // Listen for incoming messages for alerts ONLY
            window.addEventListener('flutter-sms-data', (event) => {
                this.handleAlertEvent(event.detail);
            });

            // Listen for alert-specific events
            window.addEventListener('sms-alert-trigger', (event) => {
                this.triggerAlert(event.detail);
            });

            console.log('🚨 Alert System: Event listeners established');
        }

        /**
         * Process Flutter data for alert purposes only
         */
        handleAlertEvent(data) {
            if (!this.alertEnabled || !data) {
                return;
            }

            // Only trigger alerts for incoming messages
            if (data.action === 'incoming_message' && data.contactId) {
                console.log(`🚨 Alert System: Processing incoming message alert for ${data.contactId}`);
                
                const alertData = {
                    contactId: data.contactId,
                    messageText: data.message?.text || 'New message',
                    timestamp: Date.now(),
                    phoneNumber: data.message?.phoneNumber
                };

                this.triggerIncomingMessageAlert(alertData);
            }
        }

        /**
         * Trigger alert for incoming message
         */
        triggerIncomingMessageAlert(alertData) {
            const { contactId, messageText, timestamp } = alertData;

            console.log(`🚨 Alert System: Triggering incoming message alert for ${contactId}`);

            // Get contact info for alert display
            const contactInfo = this.getContactInfo(contactId);
            
            // Create alert object
            const alert = {
                id: `alert_${Date.now()}`,
                type: 'incoming_message',
                contactId,
                contactInfo,
                messageText: messageText.substring(0, 50), // Truncate for alert
                timestamp,
                dismissed: false
            };

            // Store alert
            this.activeAlerts.set(contactId, alert);
            this.alertHistory.unshift(alert);
            if (this.alertHistory.length > 20) {
                this.alertHistory.pop(); // Keep only last 20 alerts
            }

            // Trigger visual alert
            if (this.visualEnabled) {
                this.showVisualAlert(alert);
            }

            // Trigger sound alert
            if (this.soundEnabled) {
                this.playSoundAlert(alert);
            }

            // Trigger contact manager alert
            this.notifyContactManager(alert);
        }

        /**
         * Show visual alert (floating notification)
         */
        showVisualAlert(alert) {
            console.log(`🚨 Visual Alert: ${alert.contactInfo?.name || alert.contactId} - ${alert.messageText}`);
            
            // Create floating alert UI
            const alertElement = this.createAlertElement(alert);
            document.body.appendChild(alertElement);

            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                this.dismissAlert(alert.id, alertElement);
            }, 5000);
        }

        /**
         * Create alert DOM element
         */
        createAlertElement(alert) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'sms-alert-notification';
            alertDiv.dataset.alertId = alert.id;
            
            alertDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2196F3;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                cursor: pointer;
                animation: slideInRight 0.3s ease-out;
            `;

            alertDiv.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">
                    📱 ${alert.contactInfo?.name || alert.contactId}
                </div>
                <div style="opacity: 0.9;">
                    ${alert.messageText}
                </div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 5px;">
                    ${new Date(alert.timestamp).toLocaleTimeString()}
                </div>
            `;

            // Click to dismiss
            alertDiv.addEventListener('click', () => {
                this.dismissAlert(alert.id, alertDiv);
            });

            return alertDiv;
        }

        /**
         * Play sound alert
         */
        playSoundAlert(alert) {
            try {
                // Create simple beep sound
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);

                console.log('🚨 Sound Alert: Played notification sound');
            } catch (error) {
                console.log('🚨 Sound Alert: Could not play sound -', error.message);
            }
        }

        /**
         * Notify contact manager for visual indicators
         */
        notifyContactManager(alert) {
            if (window.app?.contactManager) {
                window.app.contactManager.notifyNewMessage(alert.contactId, alert);
                console.log(`🚨 Contact Manager: Notified about new message for ${alert.contactId}`);
            }
        }

        /**
         * Dismiss alert
         */
        dismissAlert(alertId, alertElement = null) {
            // Remove from active alerts
            for (const [contactId, alert] of this.activeAlerts) {
                if (alert.id === alertId) {
                    alert.dismissed = true;
                    this.activeAlerts.delete(contactId);
                    break;
                }
            }

            // Remove DOM element
            if (alertElement && alertElement.parentNode) {
                alertElement.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (alertElement.parentNode) {
                        alertElement.parentNode.removeChild(alertElement);
                    }
                }, 300);
            }

            console.log(`🚨 Alert dismissed: ${alertId}`);
        }

        /**
         * Get contact info for alert display
         */
        getContactInfo(contactId) {
            if (window.app?.contactManager?.contacts) {
                const contact = window.app.contactManager.contacts.get(contactId);
                return contact?.contactData || null;
            }
            return null;
        }

        /**
         * Manual alert trigger (for testing)
         */
        triggerTestAlert(contactId, messageText = 'Test message') {
            const alertData = {
                contactId,
                messageText,
                timestamp: Date.now(),
                phoneNumber: 'test'
            };
            
            this.triggerIncomingMessageAlert(alertData);
        }

        /**
         * Configure alert settings
         */
        configure(settings) {
            if (settings.alertEnabled !== undefined) {
                this.alertEnabled = settings.alertEnabled;
            }
            if (settings.soundEnabled !== undefined) {
                this.soundEnabled = settings.soundEnabled;
            }
            if (settings.visualEnabled !== undefined) {
                this.visualEnabled = settings.visualEnabled;
            }
            
            console.log('🚨 Alert System configured:', { 
                alerts: this.alertEnabled, 
                sound: this.soundEnabled, 
                visual: this.visualEnabled 
            });
        }

        /**
         * Get system status
         */
        getStatus() {
            return {
                enabled: this.alertEnabled,
                soundEnabled: this.soundEnabled,
                visualEnabled: this.visualEnabled,
                activeAlerts: this.activeAlerts.size,
                recentAlerts: this.alertHistory.length
            };
        }

        /**
         * Clear all alerts
         */
        clearAllAlerts() {
            this.activeAlerts.clear();
            this.alertHistory = [];
            
            // Remove all alert DOM elements
            const alertElements = document.querySelectorAll('.sms-alert-notification');
            alertElements.forEach(element => {
                element.parentNode?.removeChild(element);
            });
            
            console.log('🚨 All alerts cleared');
        }
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Create and export the alert system
    window.smsAlertSystem = new SmsAlertSystem();
    console.log('🚨 SMS Alert System ready - isolated experimental features');

})();
