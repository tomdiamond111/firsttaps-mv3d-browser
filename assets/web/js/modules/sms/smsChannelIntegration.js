/**
 * SMS Channel Integration
 * Integrates SMS Channel Manager with existing SMS interaction system
 * Provides seamless connection between Flutter SMS channels and JavaScript SMS interactions
 */

(function() {
    'use strict';

    class SmsChannelIntegration {
        constructor() {
            this.smsChannelManager = null;
            this.smsInteractionManager = null;
            this.isIntegrated = false;
            
            console.log('📱 SmsChannelIntegration initialized');
        }

        /**
         * Initialize integration with SMS systems
         * @param {SmsChannelManager} smsChannelManager - The SMS channel manager instance
         * @param {SmsInteractionManager} smsInteractionManager - The SMS interaction manager instance
         */
        initialize(smsChannelManager, smsInteractionManager) {
            this.smsChannelManager = smsChannelManager;
            this.smsInteractionManager = smsInteractionManager;
            
            if (!this.smsChannelManager) {
                console.error('📱 SmsChannelManager not provided to integration');
                return false;
            }
            
            if (!this.smsInteractionManager) {
                console.error('📱 SmsInteractionManager not provided to integration');
                return false;
            }
            
            // Setup integration hooks
            this.setupChannelIntegration();
            this.setupInteractionHooks();
            
            this.isIntegrated = true;
            console.log('📱 SMS Channel Integration completed successfully');
            return true;
        }

        /**
         * Setup integration between SMS channels and interaction system
         */
        setupChannelIntegration() {
            if (!this.smsChannelManager || !this.smsInteractionManager) {
                console.error('📱 Cannot setup channel integration - managers not available');
                return;
            }

            // Hook SMS text input from channels to interaction manager
            this.smsChannelManager.onTextInput = (text, contactId) => {
                console.log('📱 Channel text input received:', text, 'for contact:', contactId);
                this.handleChannelTextInput(text, contactId);
            };

            // Hook SMS send requests from interaction manager to channels
            this.smsInteractionManager.onSendMessage = (message, contactId) => {
                console.log('📱 Interaction manager requesting SMS send:', message, 'to:', contactId);
                this.handleSendMessageRequest(message, contactId);
            };

            // Hook SMS conversation loading
            this.smsChannelManager.onConversationLoaded = (messages, contactId) => {
                console.log('📱 Conversation loaded from channel:', messages.length, 'messages for:', contactId);
                this.handleConversationLoaded(messages, contactId);
            };

            // Hook SMS delivery status updates
            this.smsChannelManager.onMessageStatusUpdate = (messageId, status, contactId) => {
                console.log('📱 Message status update:', messageId, status, 'for:', contactId);
                this.handleMessageStatusUpdate(messageId, status, contactId);
            };

            console.log('📱 Channel integration hooks established');
        }

        /**
         * Setup hooks for SMS interaction events
         */
        setupInteractionHooks() {
            if (!this.smsInteractionManager) {
                console.error('📱 Cannot setup interaction hooks - SMS interaction manager not available');
                return;
            }

            // Hook SMS mode entry to initialize channel communication
            const originalEnterSmsMode = this.smsInteractionManager.enterSmsMode.bind(this.smsInteractionManager);
            this.smsInteractionManager.enterSmsMode = (smsScreen, contactId) => {
                console.log('📱 SMS mode entry intercepted for channel integration');
                
                // Call original method
                originalEnterSmsMode(smsScreen, contactId);
                
                // Initialize channel communication for this contact
                this.initializeContactChannelCommunication(contactId);
            };

            // Hook SMS mode exit to cleanup channel communication
            const originalExitSmsMode = this.smsInteractionManager.exitSmsMode.bind(this.smsInteractionManager);
            this.smsInteractionManager.exitSmsMode = () => {
                console.log('📱 SMS mode exit intercepted for channel cleanup');
                
                // Cleanup channel communication
                this.cleanupChannelCommunication();
                
                // Call original method
                originalExitSmsMode();
            };

            console.log('📱 Interaction hooks established');
        }

        /**
         * Handle text input from Flutter SMS channels
         * @param {string} text - The text input from user
         * @param {string} contactId - The contact ID for the conversation
         */
        handleChannelTextInput(text, contactId) {
            if (!this.smsInteractionManager) {
                console.error('📱 Cannot handle channel text input - interaction manager not available');
                return;
            }

            // Update the SMS interaction UI with the text
            if (this.smsInteractionManager.updateTextInput) {
                this.smsInteractionManager.updateTextInput(text, contactId);
            }

            // Trigger any text input validation or processing
            if (this.smsInteractionManager.processTextInput) {
                this.smsInteractionManager.processTextInput(text, contactId);
            }

            console.log('📱 Channel text input processed:', text.length, 'characters');
        }

        /**
         * Handle SMS send request from interaction manager
         * @param {string} message - The message to send
         * @param {string} contactId - The contact ID to send to
         */
        handleSendMessageRequest(message, contactId) {
            if (!this.smsChannelManager) {
                console.error('📱 Cannot handle send request - channel manager not available');
                return;
            }

            // Send message via Flutter SMS channels
            this.smsChannelManager.sendMessage(message, contactId)
                .then((result) => {
                    console.log('📱 Message sent successfully via channels:', result);
                    
                    // Update interaction manager with send result
                    if (this.smsInteractionManager.onMessageSent) {
                        this.smsInteractionManager.onMessageSent(message, contactId, result);
                    }
                })
                .catch((error) => {
                    console.error('📱 Message send failed via channels:', error);
                    
                    // Update interaction manager with send error
                    if (this.smsInteractionManager.onMessageSendError) {
                        this.smsInteractionManager.onMessageSendError(message, contactId, error);
                    }
                });
        }

        /**
         * Handle conversation data loaded from Flutter
         * @param {Array} messages - Array of SMS messages
         * @param {string} contactId - The contact ID for the conversation
         */
        handleConversationLoaded(messages, contactId) {
            if (!this.smsInteractionManager) {
                console.error('📱 Cannot handle conversation data - interaction manager not available');
                return;
            }

            // Update SMS screen with real conversation data
            if (this.smsInteractionManager.updateConversation) {
                this.smsInteractionManager.updateConversation(messages, contactId);
            }

            // Update SMS screen visual content
            if (this.smsInteractionManager.updateSmsScreenContent) {
                this.smsInteractionManager.updateSmsScreenContent(messages, contactId);
            }

            console.log('📱 Conversation data processed:', messages.length, 'messages for contact:', contactId);
        }

        /**
         * Handle message status updates from Flutter
         * @param {string} messageId - The message ID
         * @param {string} status - The delivery status (sent, delivered, failed, etc.)
         * @param {string} contactId - The contact ID
         */
        handleMessageStatusUpdate(messageId, status, contactId) {
            if (!this.smsInteractionManager) {
                console.error('📱 Cannot handle status update - interaction manager not available');
                return;
            }

            // Update message status in interaction UI
            if (this.smsInteractionManager.updateMessageStatus) {
                this.smsInteractionManager.updateMessageStatus(messageId, status, contactId);
            }

            console.log('📱 Message status updated:', messageId, 'status:', status);
        }

        /**
         * Initialize channel communication for a specific contact
         * @param {string} contactId - The contact ID to initialize communication for
         */
        initializeContactChannelCommunication(contactId) {
            if (!this.smsChannelManager) {
                console.error('📱 Cannot initialize contact communication - channel manager not available');
                return;
            }

            // Load conversation history for this contact
            this.smsChannelManager.loadConversation(contactId)
                .then((messages) => {
                    console.log('📱 Conversation loaded for contact:', contactId, messages.length, 'messages');
                    this.handleConversationLoaded(messages, contactId);
                })
                .catch((error) => {
                    console.error('📱 Failed to load conversation for contact:', contactId, error);
                });

            // Setup real-time message listening for this contact
            this.smsChannelManager.startMessageListening(contactId);

            console.log('📱 Channel communication initialized for contact:', contactId);
        }

        /**
         * Cleanup channel communication when exiting SMS mode
         */
        cleanupChannelCommunication() {
            if (!this.smsChannelManager) {
                console.error('📱 Cannot cleanup communication - channel manager not available');
                return;
            }

            // CRITICAL FOR ALERT SYSTEM: Don't stop message listening!
            // The alert system needs continuous SMS monitoring even when screens are closed
            console.log('🚨 [ALERT SYSTEM] SMS screen closed but keeping message listening active for background alerts');
            
            // DON'T stop message listening - this would prevent background message detection
            // for the alert system that shows blue rings when screens are CLOSED
            // this.smsChannelManager.stopMessageListening();

            // Clear any pending operations (this is safe to do)
            this.smsChannelManager.clearPendingOperations();

            console.log('📱 Channel communication cleaned up (keeping listening active)');
        }

        /**
         * Check if integration is properly initialized
         * @returns {boolean} True if integration is ready
         */
        isReady() {
            return this.isIntegrated && 
                   this.smsChannelManager && 
                   this.smsInteractionManager &&
                   this.smsChannelManager.isConnected();
        }

        /**
         * Get integration status for debugging
         * @returns {Object} Status object with integration details
         */
        getStatus() {
            return {
                isIntegrated: this.isIntegrated,
                hasChannelManager: !!this.smsChannelManager,
                hasInteractionManager: !!this.smsInteractionManager,
                channelManagerConnected: this.smsChannelManager ? this.smsChannelManager.isConnected() : false,
                isReady: this.isReady()
            };
        }
    }

    // Make the class available globally
    window.SmsChannelIntegration = SmsChannelIntegration;

    console.log('📱 SmsChannelIntegration class registered globally');

})();
