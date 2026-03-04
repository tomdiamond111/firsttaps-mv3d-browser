/**
 * CONTACT OPTIONS MENU
 * Provides an options menu for contact interactions: Call Contact, Customize Avatar, Cancel
 */

class ContactOptionsMenu {
    constructor() {
        this.isMenuOpen = false;
        this.currentContactId = null;
        this.currentContactData = null;
        this.overlay = null;
        this.menuUI = null;
    }

    /**
     * Show the contact options menu
     * @param {string} contactId - The contact ID
     * @param {Object} contactData - Contact data including name, phone, etc.
     */
    showOptionsMenu(contactId, contactData) {
        if (this.isMenuOpen) {
            this.hideOptionsMenu();
            return;
        }

        this.currentContactId = contactId;
        this.currentContactData = contactData;
        this.isMenuOpen = true;

        // Create overlay
        this.createOverlay();
        
        // Create options menu UI
        this.createOptionsMenuUI();
        
        // Prevent touch/click events from propagating to the 3D scene
        this.blockSceneInteraction();
    }

    /**
     * Hide the options menu
     */
    hideOptionsMenu() {
        if (!this.isMenuOpen) return;

        this.isMenuOpen = false;
        this.currentContactId = null;
        this.currentContactData = null;

        // Remove UI elements safely
        if (this.menuUI && this.menuUI.parentNode) {
            this.menuUI.parentNode.removeChild(this.menuUI);
            this.menuUI = null;
        }

        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }

        // Restore scene interaction
        this.unblockSceneInteraction();
    }

    /**
     * Create semi-transparent overlay
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hideOptionsMenu();
            }
        });

        document.body.appendChild(this.overlay);
    }

    /**
     * Create the options menu UI
     */
    createOptionsMenuUI() {
        this.menuUI = document.createElement('div');
        this.menuUI.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90vw;
            width: 320px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
        `;

        const contactName = this.currentContactData?.name || 'Contact';
        const phoneNumber = this.currentContactData?.phone || this.currentContactData?.phoneNumber || '';

        const html = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin: 0 0 5px 0; color: #333; font-size: 18px;">${contactName}</h2>
                ${phoneNumber ? `<p style="margin: 0; color: #666; font-size: 14px;">${phoneNumber}</p>` : ''}
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <button id="callContactBtn" style="
                    padding: 15px 20px; 
                    background: #007AFF; 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                ">Call Contact</button>
                
                <button id="textContactBtn" style="
                    padding: 15px 20px; 
                    background: #00C7BE; 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                ">Text (SMS) Contact</button>
                
                <button id="customizeAvatarBtn" style="
                    padding: 15px 20px; 
                    background: #34C759; 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                ">Customize Avatar</button>
                
                <button id="cancelBtn" style="
                    padding: 15px 20px; 
                    background: #8E8E93; 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s;
                ">Cancel</button>
            </div>
        `;

        this.menuUI.innerHTML = html;
        this.overlay.appendChild(this.menuUI);

        // Add event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for menu buttons
     */
    setupEventListeners() {
        // Call Contact button
        document.getElementById('callContactBtn').addEventListener('click', () => {
            this.handleCallContact();
        });
        
        // Text (SMS) Contact button
        document.getElementById('textContactBtn').addEventListener('click', () => {
            this.handleTextContact();
        });

        // Customize Avatar button
        document.getElementById('customizeAvatarBtn').addEventListener('click', () => {
            this.handleCustomizeAvatar();
        });

        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideOptionsMenu();
        });

        // Add hover effects
        const buttons = this.menuUI.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                if (button.id === 'callContactBtn') {
                    button.style.backgroundColor = '#0056CC';
                } else if (button.id === 'textContactBtn') {
                    button.style.backgroundColor = '#009F97';
                } else if (button.id === 'customizeAvatarBtn') {
                    button.style.backgroundColor = '#28A745';
                } else if (button.id === 'cancelBtn') {
                    button.style.backgroundColor = '#6C757D';
                }
            });

            button.addEventListener('mouseleave', () => {
                if (button.id === 'callContactBtn') {
                    button.style.backgroundColor = '#007AFF';
                } else if (button.id === 'textContactBtn') {
                    button.style.backgroundColor = '#00C7BE';
                } else if (button.id === 'customizeAvatarBtn') {
                    button.style.backgroundColor = '#34C759';
                } else if (button.id === 'cancelBtn') {
                    button.style.backgroundColor = '#8E8E93';
                }
            });
        });
    }

    /**
     * Handle Call Contact action
     */
    async handleCallContact() {
        console.log('📞 Call Contact requested for:', this.currentContactData?.name);
        console.log('📞 Contact phone:', this.currentContactData?.phone || this.currentContactData?.phoneNumber || 'No phone number');
        
        try {
            // Check if dialer bridge is available
            if (!window.contactDialerBridge) {
                console.error('📞 ContactDialerBridge not available');
                alert('Dialer service not available');
                this.hideOptionsMenu();
                return;
            }

            // Get phone number from contact data
            const phoneNumber = this.currentContactData?.phone || this.currentContactData?.phoneNumber;
            
            // Validate phone number
            if (!phoneNumber) {
                console.warn('📞 No phone number available for contact:', this.currentContactData?.name);
                alert('No phone number available for this contact');
                this.hideOptionsMenu();
                return;
            }

            // Close menu before attempting to dial
            this.hideOptionsMenu();

            // Attempt to dial the contact
            const success = await window.contactDialerBridge.dialContact({
                phoneNumber: phoneNumber,
                contactName: this.currentContactData?.name,
                contactId: this.currentContactId
            });

            if (success) {
                console.log('📞 ✅ Successfully initiated call to', this.currentContactData?.name);
            } else {
                console.warn('📞 ❌ Failed to initiate call to', this.currentContactData?.name);
            }

        } catch (error) {
            console.error('📞 Error handling call contact:', error);
            alert('Failed to initiate call');
            this.hideOptionsMenu();
        }
    }

    /**
     * Handle Text (SMS) Contact action
     */
    handleTextContact() {
        console.log('📱 Text Contact requested for:', this.currentContactData?.name);
        console.log('📱 Contact phone:', this.currentContactData?.phone || this.currentContactData?.phoneNumber || 'No phone number');
        
        try {
            // Get phone number from contact data
            const phoneNumber = this.currentContactData?.phone || this.currentContactData?.phoneNumber;
            
            // Validate phone number
            if (!phoneNumber) {
                console.warn('📱 No phone number available for contact:', this.currentContactData?.name);
                alert('No phone number available for this contact');
                this.hideOptionsMenu();
                return;
            }

            // Close menu before opening SMS app
            this.hideOptionsMenu();

            // Use Flutter bridge to open native SMS app
            const cleanNumber = phoneNumber.replace(/[^\d+]/g, ''); // Clean number
            
            console.log('📱 Opening native SMS app via Flutter bridge for:', cleanNumber);
            
            // Try Flutter ExternalUrlHandler channel
            if (window.ExternalUrlHandler && window.ExternalUrlHandler.postMessage) {
                try {
                    window.ExternalUrlHandler.postMessage(JSON.stringify({
                        url: `sms:${cleanNumber}`,
                        linkType: 'sms'
                    }));
                    console.log('📱 ✅ SMS app request sent to Flutter for', this.currentContactData?.name);
                } catch (error) {
                    console.error('📱 Error sending SMS request to Flutter:', error);
                    // Fallback: try window.open which may work better than location.href
                    try {
                        window.open(`sms:${cleanNumber}`, '_system');
                    } catch (fallbackError) {
                        console.error('📱 Fallback SMS open failed:', fallbackError);
                    }
                }
            } else {
                console.warn('📱 ExternalUrlHandler not available, using fallback');
                try {
                    window.open(`sms:${cleanNumber}`, '_system');
                } catch (error) {
                    console.error('📱 Fallback SMS open failed:', error);
                }
            }

        } catch (error) {
            console.error('📱 Error opening SMS app:', error);
            alert('Failed to open SMS app');
            this.hideOptionsMenu();
        }
    }
    
    /**
     * Handle Customize Avatar action
     */
    handleCustomizeAvatar() {
        console.log('👤 Customize Avatar requested for:', this.currentContactData?.name);
        console.log('👤 Contact ID:', this.currentContactId);
        console.log('👤 Contact Data:', this.currentContactData);
        
        // Store contact data before hiding menu
        const contactId = this.currentContactId;
        const contactData = this.currentContactData;
        
        // Hide the options menu first
        this.hideOptionsMenu();
        
        try {
            // Check if ContactCustomizationManager is available
            if (!window.ContactCustomizationManager) {
                console.error('👤 ❌ ContactCustomizationManager not available globally');
                alert('Avatar customization system not loaded');
                return;
            }
            
            // Check if ContactCustomizationManager instance is initialized
            if (!window.ContactCustomizationManager.instance) {
                console.error('👤 ❌ ContactCustomizationManager not initialized');
                console.log('👤 🔧 Attempting to initialize ContactCustomizationManager...');
                
                // Try to initialize if we have access to THREE, scene, and camera
                if (window.app && window.app.THREE && window.app.scene && window.app.camera) {
                    window.ContactCustomizationManager.initialize(
                        window.app.THREE, 
                        window.app.scene, 
                        window.app.camera
                    );
                    console.log('👤 ✅ ContactCustomizationManager initialized successfully');
                } else {
                    console.error('👤 ❌ Cannot initialize - missing THREE, scene, or camera');
                    alert('Avatar customization system not ready');
                    return;
                }
            }
            
            console.log('👤 Calling ContactCustomizationManager.showCustomizationMenu()');
            const success = window.ContactCustomizationManager.showCustomizationMenu(
                contactId, 
                contactData
            );
            
            if (success !== false) {
                console.log('👤 ✅ Avatar customization menu opened successfully');
            } else {
                console.warn('👤 ⚠️ Avatar customization menu failed to open');
                alert('Failed to open avatar customization menu');
            }
        } catch (error) {
            console.error('👤 ❌ Avatar customization failed:', error);
            console.error('👤 ❌ Error stack:', error.stack);
            alert('Failed to open avatar customization: ' + error.message);
        }
    }

    /**
     * Block 3D scene interaction while menu is open
     */
    blockSceneInteraction() {
        // TODO: Implement scene interaction blocking if needed
    }

    /**
     * Restore 3D scene interaction
     */
    unblockSceneInteraction() {
        // TODO: Implement scene interaction restoration if needed
    }

    /**
     * Check if the options menu is currently open
     */
    isMenuVisible() {
        return this.isMenuOpen;
    }
}

// Create a singleton instance
window.ContactOptionsMenu = new ContactOptionsMenu();

console.log('📱 Contact Options Menu loaded');
