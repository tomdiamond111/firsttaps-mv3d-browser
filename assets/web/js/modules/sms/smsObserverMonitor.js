/**
 * SMS Observer Monitor (JavaScript side)
 * Monitors SMS ContentObserver health from JavaScript
 * Provides UI notifications and automatic recovery coordination
 */

(function() {
    'use strict';

    class SmsObserverMonitor {
        constructor() {
            this.isMonitoring = false;
            this.lastEventTime = Date.now();
            this.recoveryAttempts = 0;
            this.maxRecoveryAttempts = 3;
            
            console.log('📱 🏥 SmsObserverMonitor initialized');
        }

        /**
         * Start monitoring observer health
         */
        startMonitoring() {
            if (this.isMonitoring) {
                console.log('📱 🏥 Observer monitoring already active');
                return;
            }

            this.isMonitoring = true;
            this.lastEventTime = Date.now();
            console.log('📱 🏥 Started SMS observer monitoring from JavaScript');
        }

        /**
         * Handle observer events from Flutter
         */
        handleObserverEvent(event) {
            console.log('📱 🏥 Observer event received:', event);
            this.lastEventTime = Date.now();
            this.recoveryAttempts = 0; // Reset on successful event

            switch (event.event) {
                case 'observer_recovered':
                    this.onObserverRecovered(event);
                    break;
                case 'observer_recovery_triggered':
                    this.onRecoveryTriggered(event);
                    break;
                default:
                    console.log('📱 🏥 Unknown observer event:', event.event);
            }
        }

        /**
         * Observer successfully recovered
         */
        onObserverRecovered(event) {
            console.log('📱 ✅ SMS observer recovered successfully');
            this.recoveryAttempts = 0;
            
            // Notify UI if needed
            if (window.app && window.app.showNotification) {
                window.app.showNotification('SMS receiving restored', 'success');
            }

            // Reload any pending conversations
            this.reloadActiveConversations();
        }

        /**
         * Recovery was triggered
         */
        onRecoveryTriggered(event) {
            this.recoveryAttempts++;
            console.log(`📱 🔄 SMS observer recovery attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts}`);

            if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
                console.error('📱 🚨 Max recovery attempts reached - observer may be permanently broken');
                this.onRecoveryFailed();
            }
        }

        /**
         * Recovery failed permanently
         */
        onRecoveryFailed() {
            console.error('📱 ❌ SMS observer recovery failed permanently');
            
            // Notify user
            if (window.app && window.app.showNotification) {
                window.app.showNotification(
                    'SMS receiving may be unavailable. Please restart the app.',
                    'error'
                );
            }
        }

        /**
         * Reload active conversations after recovery
         */
        reloadActiveConversations() {
            try {
                if (window.app && window.app.smsIntegrationManager) {
                    console.log('📱 🔄 Reloading active conversations after recovery...');
                    
                    // Trigger conversation reload for currently active contact
                    if (window.app.interactionManager && 
                        window.app.interactionManager.smsInteractionManager &&
                        window.app.interactionManager.smsInteractionManager.currentContactId) {
                        
                        const contactId = window.app.interactionManager.smsInteractionManager.currentContactId;
                        window.app.smsIntegrationManager.refreshConversation(contactId);
                    }
                }
            } catch (error) {
                console.error('📱 ❌ Error reloading conversations:', error);
            }
        }

        /**
         * Check if observer is healthy based on last event time
         */
        isHealthy() {
            if (!this.isMonitoring) return true;
            
            const timeSinceLastEvent = Date.now() - this.lastEventTime;
            const healthyThreshold = 60000; // 60 seconds
            
            return timeSinceLastEvent < healthyThreshold;
        }

        /**
         * Get observer status
         */
        getStatus() {
            return {
                monitoring: this.isMonitoring,
                healthy: this.isHealthy(),
                lastEventTime: this.lastEventTime,
                timeSinceLastEvent: Date.now() - this.lastEventTime,
                recoveryAttempts: this.recoveryAttempts
            };
        }

        /**
         * Stop monitoring
         */
        stopMonitoring() {
            this.isMonitoring = false;
            console.log('📱 🏥 Stopped SMS observer monitoring from JavaScript');
        }
    }

    // Create global instance
    window.smsObserverMonitor = new SmsObserverMonitor();

    // Add event handler to global SmsSystem
    if (window.SmsSystem) {
        window.SmsSystem.handleObserverEvent = (event) => {
            window.smsObserverMonitor.handleObserverEvent(event);
        };
        
        window.SmsSystem.getObserverStatus = () => {
            return window.smsObserverMonitor.getStatus();
        };
    }

    console.log('📱 🏥 SmsObserverMonitor registered globally');

})();
