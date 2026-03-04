/**
 * SmsEventNotifier - Handles SMS event notifications and UI updates
 * Extracted from smsChannelManager.js for better maintainability
 */
(function() {
    'use strict';

    class SmsEventNotifier {
        constructor(messageHandler, contactResolver, throttleManager) {
            this.messageHandler = messageHandler;
            this.contactResolver = contactResolver;
            this.throttleManager = throttleManager;
            
            console.log('📱 SmsEventNotifier initialized');
        }

        /**
         * Handle keyboard state notifications
         */
        notifyKeyboardState(isShown) {
            console.log('📱 Keyboard state changed:', isShown ? 'shown' : 'hidden');
            
            // Emit custom event for other components to listen to
            const event = new CustomEvent('smsKeyboardStateChanged', {
                detail: { isShown }
            });
            window.dispatchEvent(event);
        }

        /**
         * Handle text input notifications
         */
        notifyTextInput(text, contactId = null) {
            console.log('📱 Text input received:', text?.length || 0, 'characters');
            
            // Store current contact for context
            if (contactId) {
                this.messageHandler.setCurrentContactId(contactId);
            }
            
            // PERFORMANCE FIX: Simplified SMS screen update - no cascading refreshes
            const activeContactId = this.messageHandler.getCurrentContactId() || contactId;
            if (activeContactId && window.app?.contactManager?.contacts) {
                const contact = window.app.contactManager.contacts.get(activeContactId);
                if (contact?.smsScreen?.isVisible && typeof contact.smsScreen.updateInputText === 'function') {
                    contact.smsScreen.updateInputText(text);
                    console.log(`[UI] ✅ SMS screen input updated for contact: ${activeContactId}`);
                }
            }
            
            // Pass text input to SMS integration system (lightweight operation only)
            if (window.app?.smsIntegrationManager?.handleChannelTextInput) {
                window.app.smsIntegrationManager.handleChannelTextInput(text, activeContactId);
            }
            
            // Emit custom event
            const event = new CustomEvent('smsTextInputReceived', {
                detail: { text, contactId: activeContactId }
            });
            window.dispatchEvent(event);
        }

        /**
         * Handle message sent notifications
         */
        notifyMessageSent(response) {
            console.log('📱 Message sent:', response);
            
            const contactId = response.contactId;
            const messageText = response.text || response.message || 'N/A';
            
            // Mark new message activity for this contact
            if (contactId) {
                this.throttleManager.markNewMessageActivity(contactId, 'sent');
            }
            
            // Update SMS screen if visible
            this.updateSmsScreenIfVisible(contactId);
            
            // Emit custom event
            const event = new CustomEvent('smsMessageSent', {
                detail: response
            });
            window.dispatchEvent(event);
        }

        /**
         * Handle message received notifications
         */
        notifyMessageReceived(response) {
            console.log('📱 [CRITICAL DEBUG] ⭐⭐⭐ notifyMessageReceived called ⭐⭐⭐');
            console.log('📱 [CRITICAL DEBUG] Response object:', JSON.stringify(response, null, 2));
            
            const contactId = response.contactId;
            const messageText = response.text || 'N/A';
            const phoneNumber = response.phoneNumber || response.phone || response.from || 'N/A';
            
            if (!contactId) {
                console.warn('📱 [CRITICAL DEBUG] ❌ notifyMessageReceived: No contactId provided', response);
                return;
            }
            
            console.log(`📱 [CRITICAL DEBUG] Processing received message for contact ${contactId}: "${messageText}"`);
            console.log(`📱 [CRITICAL DEBUG] Phone number: ${phoneNumber}`);
            
            // Handle phone-to-contactId mapping if needed
            let resolvedContactId = contactId;
            if (phoneNumber && phoneNumber !== 'N/A') {
                try {
                    resolvedContactId = this.contactResolver.mapPhoneToContactId(phoneNumber, contactId);
                    console.log(`📱 [CRITICAL DEBUG] Resolved contactId: ${resolvedContactId}`);
                } catch (error) {
                    console.warn('📱 [CRITICAL DEBUG] Failed to resolve contactId:', error.message);
                }
            }
            
            // Mark new message activity for this contact
            this.throttleManager.markNewMessageActivity(resolvedContactId, 'received');
            
            // Check if SMS screen is currently visible for this contact
            if (window.app?.contactManager?.contacts) {
                const contact = window.app.contactManager.contacts.get(resolvedContactId);
                console.log(`📱 [CRITICAL DEBUG] Contact found: ${!!contact}`);
                console.log(`📱 [CRITICAL DEBUG] SMS screen exists: ${!!contact?.smsScreen}`);
                console.log(`📱 [CRITICAL DEBUG] SMS screen visible: ${contact?.smsScreen?.isVisible}`);
            }
            
            // Prevent refresh throttling for new messages
            if (this.throttleManager.shouldThrottleRefresh(resolvedContactId)) {
                console.log(`📱 [CRITICAL DEBUG] 🚫 Refresh already pending for contact ${resolvedContactId} - skipping duplicate`);
                return;
            }
            
            // Primary approach: Use SMS Integration Manager for conversation refresh
            if (window.app?.smsIntegrationManager) {
                console.log(`📱 [CRITICAL DEBUG] Triggering conversation refresh via SMS Integration Manager for contact ${resolvedContactId}`);
                
                // Force refresh to ensure the new message is included
                window.app.smsIntegrationManager.getConversation(resolvedContactId, true)
                    .then((messages) => {
                        console.log(`📱 [CRITICAL DEBUG] Conversation refreshed for ${resolvedContactId}, found ${messages.length} messages`);
                        
                        // Clear the pending refresh flag
                        this.throttleManager.clearPendingRefresh(resolvedContactId);
                        
                        // Additionally update SMS screen directly if it's visible
                        this.updateSmsScreenIfVisible(resolvedContactId, messages);
                    })
                    .catch((error) => {
                        console.error(`📱 [CRITICAL DEBUG] Failed to refresh conversation for ${resolvedContactId}:`, error);
                        
                        // Clear the pending refresh flag even on error
                        this.throttleManager.clearPendingRefresh(resolvedContactId);
                    });
            } else if (this.messageHandler) {
                // Fallback: Use message handler directly
                console.log(`📱 [CRITICAL DEBUG] FALLBACK: Using message handler to refresh conversation for contact ${resolvedContactId}`);
                this.messageHandler.loadConversation(resolvedContactId);
                
                // Clear the pending refresh flag for fallback as well
                this.throttleManager.clearPendingRefresh(resolvedContactId);
            } else {
                console.error('📱 [CRITICAL DEBUG] ❌ No SMS managers available for handling received message!', {
                    contactId: resolvedContactId,
                    phoneNumber,
                    hasApp: !!window.app,
                    hasIntegrationManager: !!window.app?.smsIntegrationManager,
                    hasMessageHandler: !!this.messageHandler
                });
            }
            
            // Emit custom event
            const event = new CustomEvent('smsMessageReceived', {
                detail: { ...response, resolvedContactId }
            });
            window.dispatchEvent(event);
        }

        /**
         * Update SMS screen if it's currently visible
         */
        updateSmsScreenIfVisible(contactId, messages = null) {
            if (!contactId || !window.app?.contactManager?.contacts) {
                return;
            }
            
            const contact = window.app.contactManager.contacts.get(contactId);
            if (!contact?.smsScreen?.isVisible) {
                return;
            }
            
            console.log(`📱 [UI] Updating SMS screen for visible contact: ${contactId}`);
            
            if (messages && typeof contact.smsScreen.updateMessages === 'function') {
                // Direct update with provided messages
                contact.smsScreen.updateMessages(messages);
                console.log(`📱 [UI] ✅ SMS screen messages updated directly for contact: ${contactId}`);
            } else if (typeof contact.smsScreen.refreshConversation === 'function') {
                // Trigger refresh
                contact.smsScreen.refreshConversation();
                console.log(`📱 [UI] ✅ SMS screen refresh triggered for contact: ${contactId}`);
            } else {
                console.warn(`📱 [UI] ⚠️ SMS screen for contact ${contactId} doesn't support updates`);
            }
        }

        /**
         * Handle connection status notifications
         */
        notifyConnectionStatus(isConnected) {
            console.log('📱 SMS connection status changed:', isConnected ? 'connected' : 'disconnected');
            
            // Emit custom event
            const event = new CustomEvent('smsConnectionStatusChanged', {
                detail: { isConnected }
            });
            window.dispatchEvent(event);
        }

        /**
         * Handle permission status notifications
         */
        notifyPermissionStatus(hasPermission, permissions = {}) {
            console.log('📱 SMS permission status:', hasPermission ? 'granted' : 'denied', permissions);
            
            // Emit custom event
            const event = new CustomEvent('smsPermissionStatusChanged', {
                detail: { hasPermission, permissions }
            });
            window.dispatchEvent(event);
        }

        /**
         * Handle error notifications
         */
        notifyError(error, context = {}) {
            console.error('📱 SMS error notification:', error, context);
            
            // Emit custom event
            const event = new CustomEvent('smsError', {
                detail: { error, context }
            });
            window.dispatchEvent(event);
        }

        /**
         * Setup event listeners for external components
         */
        setupEventListeners() {
            // Listen for SMS integration events
            window.addEventListener('smsIntegrationEvent', (event) => {
                const { type, data } = event.detail;
                console.log(`📱 [Event] SMS integration event: ${type}`, data);
                
                switch (type) {
                    case 'messageReceived':
                        this.notifyMessageReceived(data);
                        break;
                    case 'messageSent':
                        this.notifyMessageSent(data);
                        break;
                    case 'connectionChanged':
                        this.notifyConnectionStatus(data.isConnected);
                        break;
                    case 'permissionChanged':
                        this.notifyPermissionStatus(data.hasPermission, data.permissions);
                        break;
                    case 'error':
                        this.notifyError(data.error, data.context);
                        break;
                }
            });
            
            console.log('📱 Event listeners setup complete');
        }

        /**
         * Remove event listeners
         */
        removeEventListeners() {
            // Remove listeners if needed
            console.log('📱 Event listeners removed');
        }

        /**
         * Get notification statistics
         */
        getNotificationStats() {
            return {
                throttleStats: this.throttleManager.getStats(),
                currentContact: this.messageHandler.getCurrentContactId(),
                isFlutterConnected: this.messageHandler.channelSetup?.isFlutterConnected || false
            };
        }
    }

    // Export to global scope
    window.SmsEventNotifier = SmsEventNotifier;
    console.log('📱 SmsEventNotifier class exported to window');

})();
