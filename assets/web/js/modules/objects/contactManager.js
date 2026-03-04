/**
 * Contact Manager Module
 * Manages all contact objects and their interactions
 */

// Contact Manager will be initialized after ContactObject is available
window.ContactManagerClass = class ContactManager {
    constructor(scene) {
        this.scene = scene;
        this.contacts = new Map();
        this.activeContactId = null;
        this.isSyncing = false;
        
        // Initialize deletion tracking
        this.initializeDeletionTracking();
        
        this.setupEventListeners();
        console.log('📱 Contact Manager initialized');
    }
    
    /**
     * Initialize deletion tracking system
     */
    initializeDeletionTracking() {
        // Initialize global deletion tracking
        if (!window.deletedContactIds) {
            window.deletedContactIds = new Set();
        }
        
        // CRITICAL FIX: Skip localStorage loading during world restoration
        // Check if we're in a restoration context where localStorage was already cleared
        if (window._worldRestorationInProgress) {
            console.log('📱 SKIPPING deletion tracking reload - world restoration in progress');
            return;
        }
        
        // Load deleted contacts from localStorage
        try {
            const stored = localStorage.getItem('deletedContactIds');
            if (stored) {
                const deletedArray = JSON.parse(stored);
                deletedArray.forEach(id => window.deletedContactIds.add(id));
                console.log(`📱 Loaded ${deletedArray.length} deleted contact IDs from storage`);
            }
        } catch (error) {
            console.error('Error loading deleted contacts from storage:', error);
        }
    }

    /**
     * Save deleted contacts to localStorage
     */
    saveDeletedContactsToStorage() {
        try {
            const deletedArray = Array.from(window.deletedContactIds);
            localStorage.setItem('deletedContactIds', JSON.stringify(deletedArray));
            console.log(`📱 Saved ${deletedArray.length} deleted contact IDs to storage`);
        } catch (error) {
            console.error('Error saving deleted contacts to storage:', error);
        }
    }

    /**
     * Check if contact was previously deleted using multiple ID formats
     */
    isContactDeleted(contactData) {
        console.log('📱 ✅ CONTACT DELETION CHECK STARTED for:', contactData.name);
        console.log('📱 🔍 Contact data being checked:', {
            id: contactData.id,
            phoneNumber: contactData.phoneNumber,
            name: contactData.name
        });
        console.log('📱 📋 Current deleted contact IDs:', Array.from(window.deletedContactIds));
        
        const hasId = window.deletedContactIds.has(contactData.id);
        const hasPhone = window.deletedContactIds.has(contactData.phoneNumber);
        const hasName = window.deletedContactIds.has(contactData.name);
        
        console.log('📱 🔍 Individual checks:', {
            hasId: hasId,
            hasPhone: hasPhone,
            hasName: hasName,
            idToCheck: contactData.id,
            phoneToCheck: contactData.phoneNumber,
            nameToCheck: contactData.name
        });
        
        const isDeleted = hasId || hasPhone || hasName;
        
        if (isDeleted) {
            console.log('📱 ❌ Contact deletion check FAILED for:', contactData.name);
            console.log('📱 📊 Contact data:', {
                id: contactData.id,
                phoneNumber: contactData.phoneNumber,
                name: contactData.name
            });
            console.log('📱 🎯 Deletion tracking results:', {
                hasId: hasId,
                hasPhone: hasPhone,
                hasName: hasName
            });
            console.log('📱 📋 Current deleted IDs:', Array.from(window.deletedContactIds));
        } else {
            console.log('📱 ✅ Contact deletion check PASSED for:', contactData.name);
            console.log('📱 🎉 Contact is not in deleted tracking - can proceed with creation');
        }
        
        return isDeleted;
    }
    
    /**
     * Create a contact object (used by restoration system)
     */
    createContactObject(contactData) {
        console.log('📱 Creating contact object for restoration:', contactData);
        
        // Check if contact already exists to avoid duplicates
        if (this.contacts.has(contactData.id)) {
            console.log('📱 Contact already exists in map, returning existing:', contactData.name);
            return this.contacts.get(contactData.id);
        }
        
        // Create the contact and add it to the manager's contacts map for proper interaction
        const contact = new window.ContactObjectClass(contactData, this.scene);
        this.contacts.set(contactData.id, contact);
        
        // Notify Flutter about contact restoration for menu sync
        this.notifyFlutterContactRestored(contactData.id, contactData.name);
        
        // Ensure face texture is applied after mesh is fully initialized
        if (contact && contact.mesh) {
            setTimeout(() => {
                console.log('📱 Ensuring face texture for restored contact:', contactData.name);
                if (contact.createBillboard) {
                    contact.createBillboard(); // Re-apply face texture
                }
            }, 100);
        }
        
        // Add contact mesh to fileObjects array for interaction system
        if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            window.app.stateManager.fileObjects.push(contact.mesh);
            console.log(`📱 Contact object added to interaction system: ${contactData.name}`);
        }
        
        console.log(`📱 Contact object created and added to map for restoration: ${contactData.name}`);
        return contact;
    }
    
    /**
     * Handle contact object deletion (called by external systems)
     * This ensures proper SMS screen cleanup when contacts are deleted outside of ContactManager
     */
    handleContactDeletion(contactId) {
        console.log('📱 ContactManager.handleContactDeletion called for:', contactId);
        
        const contact = this.contacts.get(contactId);
        if (contact) {
            // Get contact name before deletion for Flutter notification
            const contactName = contact.contactData.name || 'Contact';
            
            // Store SMS state and remove contact properly
            this.removeContact(contactId, true);
            
            // Notify Flutter about contact deletion for undo snackbar
            this.notifyFlutterContactDeleted(contactId, contactName);
            
            console.log('📱 Contact properly deleted through ContactManager:', contactId);
            return true;
        } else {
            console.warn('📱 Contact not found in ContactManager during deletion:', contactId);
            return false;
        }
    }
    
    /**
     * Restore SMS screen for a contact after undo/restore
     */
    restoreContactSMSScreen(contactId, wasVisible = null) {
        console.log('📱 Attempting to restore SMS screen for contact:', contactId, 'wasVisible:', wasVisible);
        
        // Check stored state if wasVisible not provided
        if (wasVisible === null && window.contactSMSStates) {
            const storedState = window.contactSMSStates.get(contactId);
            if (storedState) {
                wasVisible = storedState.wasVisible;
                // Clean up stored state
                window.contactSMSStates.delete(contactId);
                console.log('📱 Retrieved stored SMS state for restoration:', contactId, 'wasVisible:', wasVisible);
            }
        }
        
        const contact = this.contacts.get(contactId);
        if (!contact) {
            console.warn('📱 Cannot restore SMS screen - contact not found in map:', contactId);
            console.log('📱 Available contacts in map:', Array.from(this.contacts.keys()));
            return;
        }
        
        if (wasVisible && !contact.smsScreen && !contact.contactInfoScreen) {
            console.log('📱 Restoring screen for contact:', contact.contactData.name);
            // Hide other screens first
            this.hideAllSMSScreens();
            contact.toggleContactInfoScreen(); // MV3D-compatible method
            this.activeContactId = contactId;
        } else if (wasVisible && contact.smsScreen && !contact.smsScreen.isVisible) {
            console.log('📱 Showing previously hidden SMS screen for contact:', contact.contactData.name);
            // Hide other SMS screens first
            this.hideAllSMSScreens();
            contact.showSMSScreen();
            this.activeContactId = contactId;
        } else if (wasVisible) {
            console.log('📱 SMS screen was visible before deletion, but contact state unclear:', contact.contactData.name);
        } else {
            console.log('📱 SMS screen was not visible before deletion, no restoration needed:', contact.contactData.name);
        }
    }
    
    /**
     * MV3D: Handle contact tap - shows Contact Info Screen or SMS Screen depending on mode
     */
    handleContactTap(contactId) {
        const contact = this.contacts.get(contactId);
        if (!contact) {
            console.warn('👤 Contact not found for tap:', contactId);
            return;
        }
        
        // Use the new toggleContactInfoScreen method which handles both modes
        contact.toggleContactInfoScreen();
        this.activeContactId = contactId;
    }
    
    /**
     * Restore avatar for a contact after undo/restore
     */
    restoreContactAvatar(contactId, hadAvatar = null) {
        const contact = this.contacts.get(contactId);
        if (!contact) {
            console.warn('👤 Contact not found for avatar restoration:', contactId);
            return;
        }

        // Check stored state if hadAvatar not provided
        if (hadAvatar === null && window.contactAvatarStates) {
            const storedState = window.contactAvatarStates.get(contactId);
            hadAvatar = storedState?.hadAvatar || false;
        }

        if (hadAvatar && window.ContactCustomizationManager?.instance) {
            console.log('👤 Restoring avatar for contact:', contact.contactData.name);
            const customizationManager = window.ContactCustomizationManager.instance;
            
            // Use stored config if available, otherwise use saved config
            let config = null;
            if (window.contactAvatarStates) {
                const storedState = window.contactAvatarStates.get(contactId);
                config = storedState?.config;
            }
            
            if (!config) {
                config = customizationManager.getContactCustomization(contactId);
            }
            
            if (config) {
                // Small delay to ensure contact mesh is fully initialized
                setTimeout(() => {
                    customizationManager.updateContactAvatar(contactId);
                    console.log('👤 Avatar restored for contact:', contact.contactData.name);
                }, 100);
            } else {
                console.warn('👤 No avatar configuration found for contact:', contactId);
            }
        } else if (!hadAvatar) {
            console.log('👤 Contact did not have avatar before, no restoration needed:', contact.contactData.name);
        }
    }
    
    /**
     * Add a new contact
     */
    addContact(contactData) {
        // Check if contact was previously deleted
        if (this.isContactDeleted(contactData)) {
            console.log(`📱 Skipping deleted contact: ${contactData.name}`);
            return null;
        }
        
        if (this.contacts.has(contactData.id)) {
            console.warn(`Contact ${contactData.id} already exists`);
            return null;
        }
        
        const contact = new window.ContactObjectClass(contactData, this.scene);
        this.contacts.set(contactData.id, contact);
        
        // Ensure proper face texture is applied after mesh is fully initialized
        if (contact && contact.mesh) {
            setTimeout(() => {
                console.log('📱 Ensuring complete face texture for new contact:', contactData.name);
                if (contact.createBillboard) {
                    contact.createBillboard(); // Apply full detailed face texture
                }
            }, 100);
        }
        
        // Apply positioning fixes for new contact (check for both null and undefined)
        const hasPersistedPosition = (contactData.x != null && contactData.z != null);
        if (!hasPersistedPosition && contact.mesh && typeof window.applyAllFixesToObject === 'function') {
            console.log('📱 New contact with no persisted position, applying full positioning');
            window.applyAllFixesToObject(contact.mesh, contactData, false);
            
            // Focus camera on new contact so user can see it
            if (window.focusOnObject && contact.mesh) {
                setTimeout(() => {
                    console.log('📷 Focusing camera on newly added contact:', contactData.name);
                    window.focusOnObject(contact.mesh);
                }, 200);
            }
            
            // Persist the new position back to Flutter
            if (contact.mesh && contact.mesh.position) {
                const newPosition = {
                    x: contact.mesh.position.x,
                    y: contact.mesh.position.y,
                    z: contact.mesh.position.z
                };
                console.log('💾 Persisting new contact position to Flutter:', newPosition);
                
                // Update the contact data in storage
                if (window.ContactPersistence && window.ContactPersistence.postMessage) {
                    window.ContactPersistence.postMessage(JSON.stringify({
                        action: 'updateContactPosition',
                        contactId: contactData.id,
                        position: newPosition
                    }));
                }
            }
        } else if (hasPersistedPosition) {
            console.log('📱 Contact has persisted position, skipping initial positioning');
        }
        
        // Add contact mesh to fileObjects array for interaction system
        if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            window.app.stateManager.fileObjects.push(contact.mesh);
            console.log(`📱 Contact added to interaction system: ${contactData.name}`);
        }
        
        // RESTORATION: Check for stored SMS and avatar states
        if (window.contactSMSStates && window.contactSMSStates.has(contactData.id)) {
            console.log('📱 Restoring SMS screen state for recreated contact:', contactData.name);
            setTimeout(() => {
                this.restoreContactSMSScreen(contactData.id);
                // Clean up stored state after restoration
                window.contactSMSStates.delete(contactData.id);
            }, 200);
        }

        if (window.contactAvatarStates && window.contactAvatarStates.has(contactData.id)) {
            console.log('👤 Restoring avatar state for recreated contact:', contactData.name);
            setTimeout(() => {
                this.restoreContactAvatar(contactData.id);
                // Clean up stored state after restoration
                window.contactAvatarStates.delete(contactData.id);
            }, 300);
        }
        
        console.log(`📱 Added contact: ${contactData.name} (${contactData.id})`);
        return contact;
    }
    
    /**
     * Sync contacts with Flutter contact list (basic method for external contact sync)
     */
    syncContactsWithFlutter() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        
        try {
            // Get current Flutter contact list (if available)
            this.getFlutterContactList().then(flutterContacts => {
                const currentContactIds = new Set(this.contacts.keys());
                
                flutterContacts.forEach(contactData => {
                    // Skip if contact was deleted
                    if (this.isContactDeleted(contactData)) {
                        console.log(`📱 Skipping deleted contact: ${contactData.name}`);
                        return;
                    }
                    
                    // Add new contacts that aren't already in the world
                    if (!currentContactIds.has(contactData.id)) {
                        this.createContactObject(contactData);
                    }
                });
                
                this.isSyncing = false;
            }).catch(error => {
                console.error('Error in syncContactsWithFlutter:', error);
                this.isSyncing = false;
            });
        } catch (error) {
            console.error('Error in syncContactsWithFlutter:', error);
            this.isSyncing = false;
        }
    }
    
    /**
     * Get Flutter contact list (now implemented with device contacts)
     */
    getFlutterContactList() {
        return new Promise((resolve, reject) => {
            try {
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    console.log('📇 Requesting device contacts from Flutter...');
                    
                    // Call Flutter bridge to get device contacts
                    window.flutter_inappwebview.callHandler('ContactsChannel', 'getDeviceContacts')
                        .then(contacts => {
                            console.log(`📇 Received ${contacts ? contacts.length : 0} device contacts`);
                            
                            // Convert device contacts to app format
                            const appContacts = (contacts || []).map(contact => ({
                                id: contact.id || contact.displayName,
                                name: contact.displayName || contact.name,
                                phoneNumber: contact.phoneNumbers && contact.phoneNumbers.length > 0 
                                    ? contact.phoneNumbers[0] 
                                    : (contact.phones && contact.phones.length > 0 ? contact.phones[0].number : null),
                                phones: contact.phones || [],
                                phoneNumbers: contact.phoneNumbers || [],
                                dateTimeOriginal: contact.phoneNumbers && contact.phoneNumbers.length > 0 
                                    ? contact.phoneNumbers[0] 
                                    : (contact.phones && contact.phones.length > 0 ? contact.phones[0].number : null),
                                cameraModel: contact.displayName || contact.name
                            })).filter(contact => contact.phoneNumber); // Only include contacts with phone numbers
                            
                            console.log(`📇 Converted to ${appContacts.length} app contacts with phone numbers`);
                            resolve(appContacts);
                        })
                        .catch(error => {
                            console.error('📇 Error getting device contacts:', error);
                            resolve([]); // Return empty array on error
                        });
                } else {
                    console.warn('📇 Flutter bridge not available, returning empty contact list');
                    resolve([]);
                }
            } catch (error) {
                console.error('📇 Error in getFlutterContactList:', error);
                resolve([]);
            }
        });
    }
    
    /**
     * Store SMS screen state before deletion (for restoration)
     */
    storeSMSStateForUndo(contactId) {
        const contact = this.contacts.get(contactId);
        if (contact && contact.smsScreen) {
            const wasVisible = contact.smsScreen.isVisible;
            console.log(`📱 Storing SMS state for ${contactId}: visible=${wasVisible}`);
            
            // Store in a temporary map for restoration
            if (!window.contactSMSStates) {
                window.contactSMSStates = new Map();
            }
            window.contactSMSStates.set(contactId, { wasVisible });
            return wasVisible;
        }
        return false;
    }
    
    /**
     * Store avatar state before deletion/clearing (for restoration)
     */
    storeAvatarStateForUndo(contactId) {
        const contact = this.contacts.get(contactId);
        if (contact && window.ContactCustomizationManager?.instance) {
            const customizationManager = window.ContactCustomizationManager.instance;
            const avatarExists = customizationManager.activeAvatars.has(contactId);
            const config = customizationManager.getContactCustomization(contactId);
            
            if (avatarExists && config) {
                console.log(`👤 Storing avatar state for ${contactId}: has avatar`);
                
                // Store in a temporary map for restoration
                if (!window.contactAvatarStates) {
                    window.contactAvatarStates = new Map();
                }
                window.contactAvatarStates.set(contactId, { 
                    hadAvatar: true, 
                    config: config 
                });
                return true;
            }
        }
        return false;
    }
    
    /**
     * Remove a contact (enhanced to handle SMS screen lifecycle and deletion tracking)
     */
    removeContact(contactId, storeState = true) {
        const contact = this.contacts.get(contactId);
        if (contact) {
            // Track multiple ID formats for deletion persistence
            const contactData = contact.contactData;
            window.deletedContactIds.add(contactId);
            window.deletedContactIds.add(contactData.phoneNumber);
            window.deletedContactIds.add(contactData.name);
            if (contactData.id) window.deletedContactIds.add(contactData.id);
            
            // Save to persistent storage
            this.saveDeletedContactsToStorage();
            
            // Store SMS and avatar states for potential restoration first
            if (storeState) {
                this.storeSMSStateForUndo(contactId);
                this.storeAvatarStateForUndo(contactId);
            }
            
            // Hide and dispose SMS screen
            if (contact.smsScreen) {
                console.log('📱 Disposing SMS screen for deleted contact:', contactId);
                contact.hideSMSScreen();
                if (contact.smsScreen && contact.smsScreen.dispose) {
                    contact.smsScreen.dispose();
                }
                // Clear reference
                contact.smsScreen = null;
            }
            
            // Remove from fileObjects array
            if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
                const index = window.app.stateManager.fileObjects.indexOf(contact.mesh);
                if (index > -1) {
                    window.app.stateManager.fileObjects.splice(index, 1);
                    console.log(`📱 Contact removed from interaction system: ${contactId}`);
                }
            }
            
            contact.dispose();
            this.contacts.delete(contactId);
            
            if (this.activeContactId === contactId) {
                this.activeContactId = null;
            }
            
            // Notify Flutter to update menu
            this.notifyFlutterOfContactChange();
            
            // CRITICAL FIX: Re-enable camera controls after contact deletion
            setTimeout(() => {
                if (window.app?.cameraControls) {
                    const controls = window.app.cameraControls;
                    
                    // Force complete reset of camera controls
                    controls.enabled = false;
                    controls.enabled = true;
                    controls.enableRotate = true;
                    controls.enableZoom = true;
                    controls.enablePan = true;
                    
                    // Force update to clear internal state
                    controls.update(0);
                    
                    console.log('📱 Camera controls comprehensively re-enabled after contact deletion');
                } else {
                    console.warn('📱 Camera controls not available for reset after contact deletion');
                }
                
                // Clear any pending interaction states
                if (window.app?.stateManager) {
                    window.app.stateManager.isLongPress = false;
                    window.app.stateManager.selectedObjectForMoveId = null;
                    window.app.stateManager.movingObject = null;
                    window.app.stateManager.selectedObject = null;
                }
            }, 100); // Small delay to ensure deletion state is clean
            
            console.log(`📱 Contact deleted and tracked: ${contactData.name}`);
            return true;
        }
        return false;
    }
    
    /**
     * Get contact by ID
     */
    getContactById(contactId) {
        return this.contacts.get(contactId);
    }
    
    /**
     * Get all contacts
     */
    getAllContacts() {
        return Array.from(this.contacts.values());
    }
    
    /**
     * Handle contact interaction (tap/click)
     * @param {string} contactId - The contact ID
     * @param {boolean} wasUserAlreadyClose - True if user was already close before camera movement
     */
    handleContactInteraction(contactId, wasUserAlreadyClose = false) {
        console.log('📱 ContactManager.handleContactInteraction called with contactId:', contactId);
        console.log('📱 User was already close (interactive mode):', wasUserAlreadyClose);
        console.log('📱 Available contacts in map:', Array.from(this.contacts.keys()));
        
        const contact = this.contacts.get(contactId);
        if (!contact) {
            console.error('📱 Contact not found in contacts map:', contactId);
            console.log('📱 Available contacts:', Array.from(this.contacts.keys()));
            return;
        }
        
        console.log('📱 Contact found, proceeding with SMS screen toggle');
        console.log('📱 Contact info screen state:', {
            hasContactInfoScreen: !!contact.contactInfoScreen,
            isVisible: contact.contactInfoScreen?.isVisible,
            hasIsVisibleProperty: contact.contactInfoScreen && 'isVisible' in contact.contactInfoScreen
        });
        
        // Check if Contact Info Screen or SMS is currently active
        // MV3D: Check contactInfoScreen.isVisible for info screen mode
        const isInfoScreenActive = contact.contactInfoScreen && contact.contactInfoScreen.isVisible;
        const isSmsActive = contact.isSelected || (contact.balloonManager && contact.balloonManager.enabled) || isInfoScreenActive;
        
        console.log('📱 Screen active status:', {
            isInfoScreenActive,
            isSmsActive,
            willHide: isSmsActive,
            willShow: !isSmsActive
        });
        
        if (isSmsActive) {
            console.log('👤 HIDING contact screen for:', contact.contactData.name);
            // Hide contact info screen or SMS screen
            if (contact.contactInfoScreen && contact.contactInfoScreen.isVisible) {
                contact.contactInfoScreen.hide();
            } else if (contact.smsScreen) {
                contact.hideSMSScreen();
            }
            this.activeContactId = null;
            
            // Dispatch SMS screen closed event for visual input cleanup
            window.dispatchEvent(new CustomEvent('sms-screen-closed', {
                detail: { contactId: contactId, contactName: contact.contactData.name }
            }));
        } else {
            console.log('💬 SHOWING SMS screen for:', contact.contactData.name);
            // Hide other SMS screens first
            this.hideAllSMSScreens();
            
            // Show screen (will show Contact Info OR SMS depending on MV3D mode)
            if (contact.smsScreen) {
                contact.showSMSScreen();
            } else if (contact.contactInfoScreen) {
                contact.contactInfoScreen.show();
            } else {
                contact.toggleContactInfoScreen(); // MV3D-compatible method
            }
            
            this.activeContactId = contactId;
            
            // Dispatch SMS screen opened event for visual input integration
            window.dispatchEvent(new CustomEvent('sms-screen-opened', {
                detail: { 
                    contactId: contactId, 
                    contactName: contact.contactData.name,
                    wasUserAlreadyClose: wasUserAlreadyClose
                }
            }));
        }
        
        console.log(`📱 Contact interaction completed: ${contact.contactData.name}`);
    }
    
    /**
     * Hide all SMS screens
     */
    hideAllSMSScreens() {
        this.contacts.forEach(contact => {
            // Hide SMS screen if visible
            if (contact.smsScreen && contact.smsScreen.isVisible) {
                contact.hideSMSScreen();
                
                // Dispatch SMS screen closed event for visual input cleanup
                window.dispatchEvent(new CustomEvent('sms-screen-closed', {
                    detail: { contactId: contact.contactData.id, contactName: contact.contactData.name }
                }));
            }
            
            // Hide contact info screen if visible (MV3D mode)
            if (contact.contactInfoScreen && contact.contactInfoScreen.isVisible) {
                contact.contactInfoScreen.hide();
                
                // Dispatch SMS screen closed event for visual input cleanup
                window.dispatchEvent(new CustomEvent('sms-screen-closed', {
                    detail: { contactId: contact.contactData.id, contactName: contact.contactData.name }
                }));
            }
        });
        this.activeContactId = null;
    }
    
    /**
     * Get active contact (with visible SMS screen)
     */
    getActiveContact() {
        return this.activeContactId ? this.contacts.get(this.activeContactId) : null;
    }
    
    /**
     * Update messages for a specific contact
     */
    updateContactMessages(contactId, messages) {
        const contact = this.contacts.get(contactId);
        if (contact) {
            contact.updateMessages(messages);
        }
    }
    
    /**
     * Send message from a contact
     */
    sendMessage(contactId, messageText) {
        const contact = this.contacts.get(contactId);
        if (contact) {
            contact.sendMessage(messageText);
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for SMS send events
        window.addEventListener('sms-send', (event) => {
            const { contactId, message } = event.detail;
            this.sendMessage(contactId, message);
        });
        
        // Listen for Flutter messages
        window.addEventListener('flutter-sms-received', (event) => {
            const { contactId, messages } = event.detail;
            this.updateContactMessages(contactId, messages);
        });
        
        // Listen for contact addition/deletion requests from Flutter Add Contacts menu
        window.addEventListener('message', (event) => {
            if (event.data && typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);
                    if (data.action === 'add_contact') {
                        this.handleContactAdditionFromFlutter(data);
                    } else if (data.action === 'remove_contact') {
                        this.handleContactRemovalFromFlutter(data);
                    }
                } catch (e) {
                    // Not JSON or not for us, ignore
                }
            }
        });
    }
    
    /**
     * Handle contact addition request from Flutter Add Contacts menu
     */
    handleContactAdditionFromFlutter(data) {
        console.log('📱 Handling contact addition from Flutter:', data);
        
        const { contactId, contactName, phoneNumber } = data;
        
        // Check if contact already exists
        if (this.contacts.has(contactId)) {
            console.log('📱 Contact already exists, skipping addition:', contactName);
            return;
        }
        
        // Calculate proper Y position based on world type and object height
        const objectHeight = 2.5; // Contact object height
        let yPosition = objectHeight / 2; // Default for non-green-plane worlds
        
        // For green-plane world, place contacts on ground like app objects
        if (window.getCurrentWorldType && window.getCurrentWorldType() === 'green-plane') {
            yPosition = 0 + (objectHeight / 2); // Bottom at Y=0, center at height/2
            console.log(`📱 Green-plane world detected: Setting contact Y position to ${yPosition} for ground placement`);
        }
        
        // Create contact data structure
        const contactData = {
            id: contactId,
            name: contactName,
            phoneNumber: phoneNumber || '+1-555-0000', // Fallback phone
            position: {
                x: Math.random() * 20 - 10, // Random X between -10 and 10
                y: yPosition, // Calculated Y position for proper ground placement
                z: Math.random() * 20 - 10  // Random Z between -10 and 10
            },
            avatar: null
        };
        
        // Add the contact to 3D world
        const contact = this.addContact(contactData);
        
        if (contact) {
            console.log(`📱 ✅ Successfully added contact from Flutter menu: ${contactName}`);
            this.notifyFlutterContactAdded(contactId, contactName);
        } else {
            console.error(`📱 ❌ Failed to add contact from Flutter menu: ${contactName}`);
        }
    }
    
    /**
     * Handle contact removal request from Flutter Add Contacts menu
     */
    handleContactRemovalFromFlutter(data) {
        console.log('📱 Handling contact removal from Flutter:', data);
        
        const { contactId, contactName } = data;
        
        // Check if contact exists
        if (!this.contacts.has(contactId)) {
            console.log('📱 Contact does not exist, skipping removal:', contactName);
            return;
        }
        
        // Remove the contact from 3D world
        const success = this.removeContact(contactId, false); // Don't store state for menu-driven deletion
        
        if (success) {
            console.log(`📱 ✅ Successfully removed contact from Flutter menu: ${contactName}`);
            this.notifyFlutterContactRemoved(contactId, contactName);
        } else {
            console.error(`📱 ❌ Failed to remove contact from Flutter menu: ${contactName}`);
        }
    }
    
    /**
     * Notify Flutter about contact restoration (for menu sync)
     */
    notifyFlutterContactRestored(contactId, contactName) {
        if (window.ContactActionChannel) {
            try {
                const restorationData = {
                    action: 'contact_restored',
                    contactId: contactId,
                    contactName: contactName,
                    timestamp: Date.now()
                };
                console.log('📱 Notifying Flutter of contact restoration:', restorationData);
                window.ContactActionChannel.postMessage(JSON.stringify(restorationData));
            } catch (error) {
                console.error('📱 Failed to notify Flutter of contact restoration:', error);
            }
        } else {
            console.warn('📱 ContactActionChannel not available for restoration notification');
        }
    }
    
    /**
     * Notify Flutter about contact deletion (for undo snackbar)
     */
    notifyFlutterContactDeleted(contactId, contactName) {
        if (window.ContactActionChannel) {
            try {
                const deletionData = {
                    action: 'contact_deleted',
                    contactId: contactId,
                    contactName: contactName,
                    timestamp: Date.now()
                };
                console.log('📱 Notifying Flutter of contact deletion:', deletionData);
                window.ContactActionChannel.postMessage(JSON.stringify(deletionData));
            } catch (error) {
                console.error('📱 Failed to notify Flutter of contact deletion:', error);
            }
        } else {
            console.warn('📱 ContactActionChannel not available for deletion notification');
        }
    }
    
    /**
     * Notify Flutter about contact addition (for menu sync)
     */
    notifyFlutterContactAdded(contactId, contactName) {
        if (window.ContactActionChannel) {
            try {
                const additionData = {
                    action: 'contact_added',
                    contactId: contactId,
                    contactName: contactName,
                    timestamp: Date.now()
                };
                console.log('📱 Notifying Flutter of contact addition:', additionData);
                window.ContactActionChannel.postMessage(JSON.stringify(additionData));
            } catch (error) {
                console.error('📱 Failed to notify Flutter of contact addition:', error);
            }
        } else {
            console.warn('📱 ContactActionChannel not available for addition notification');
        }
    }
    
    /**
     * Notify Flutter about contact removal (for menu sync)
     */
    notifyFlutterContactRemoved(contactId, contactName) {
        if (window.ContactActionChannel) {
            try {
                const removalData = {
                    action: 'contact_removed',
                    contactId: contactId,
                    contactName: contactName,
                    timestamp: Date.now()
                };
                console.log('📱 Notifying Flutter of contact removal:', removalData);
                window.ContactActionChannel.postMessage(JSON.stringify(removalData));
            } catch (error) {
                console.error('📱 Failed to notify Flutter of contact removal:', error);
            }
        } else {
            console.warn('📱 ContactActionChannel not available for removal notification');
        }
    }
    
    /**
     * Notify Flutter that contact state has changed (for menu sync)
     */
    notifyFlutterOfContactChange() {
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            const activeContactIds = Array.from(this.contacts.keys());
            window.flutter_inappwebview.callHandler('updateContactMenu', {
                activeContacts: activeContactIds,
                deletedContacts: Array.from(window.deletedContactIds)
            });
        }
    }

    
    /**
     * Get contact count
     */
    getContactCount() {
        return this.contacts.size;
    }
    
    /**
     * Get all active contact IDs (for menu sync)
     */
    getActiveContactIds() {
        return Array.from(this.contacts.keys());
    }
    
    /**
     * Get contact files for menu synchronization (mirrors app system)
     * This helps Flutter menu show accurate contact selection state
     */
    getContactFilesForMenuSync() {
        const contactFiles = [];
        
        this.contacts.forEach((contact, contactId) => {
            contactFiles.push({
                id: contactId,
                name: contact.contactData.name,
                filePath: `contact://${contactId}`,
                mimeType: `contact:${contactId}`,
                isActive: true,
                position: contact.mesh ? {
                    x: contact.mesh.position.x,
                    y: contact.mesh.position.y,
                    z: contact.mesh.position.z
                } : null
            });
        });
        
        console.log('📱 Generated contact files for menu sync:', contactFiles.length, 'contacts');
        return contactFiles;
    }
    
    /**
     * Check if contact exists in 3D world (for menu sync validation)
     */
    isContactActive(contactId) {
        return this.contacts.has(contactId);
    }
    
    /**
     * Get contact names that are currently active in 3D world
     */
    getActiveContactNames() {
        return Array.from(this.contacts.values()).map(contact => contact.contactData.name);
    }
    
    /**
     * Debug contact sync issues with enhanced menu validation
     * This helps identify contacts that exist in persistence but not in 3D world
     */
    debugContactSync() {
        console.log('🔍 DEBUG: Analyzing contact sync status...');
        
        // Check Flutter persistence side
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('getContactFiles')
                .then(contactFiles => {
                    console.log('📱 Contact files in Flutter persistence:', contactFiles);
                    
                    const activeContactIds = this.getActiveContactIds();
                    console.log('📱 Active 3D contact IDs:', activeContactIds);
                    
                    // Compare and identify orphaned contacts
                    if (contactFiles && contactFiles.length > 0) {
                        contactFiles.forEach(file => {
                            const contactName = file.name ? file.name.replace('.contact', '') : 'Unknown';
                            const hasCorresponding3D = activeContactIds.some(id => 
                                this.contacts.get(id)?.contactData?.name === contactName
                            );
                            
                            if (!hasCorresponding3D) {
                                console.warn(`⚠️ SYNC ISSUE: Contact "${contactName}" exists in persistence but not in 3D world`);
                                console.log('Contact file data:', file);
                            } else {
                                console.log(`✅ Contact "${contactName}" properly synced`);
                            }
                        });
                    }
                })
                .catch(err => {
                    console.warn('Could not get contact files from Flutter:', err);
                    
                    // Fallback: Check for window sync flags
                    if (window.lastDeletedContactForMenuSync) {
                        console.log('📱 Found pending deletion sync:', window.lastDeletedContactForMenuSync);
                    }
                    
                    if (window.lastRestoredContactForMenuSync) {
                        console.log('📱 Found pending restoration sync:', window.lastRestoredContactForMenuSync);
                    }
                });
        }
        
        // Also check fileObjects array
        if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            const fileObjects = window.app.stateManager.fileObjects;
            const contactFiles = fileObjects.filter(obj => 
                obj.userData && 
                obj.userData.fileName && 
                obj.userData.fileName.includes('.contact')
            );
            
            console.log(`📱 Contact files in fileObjects: ${contactFiles.length}`);
            contactFiles.forEach(obj => {
                console.log(`  - ${obj.userData.fileName} at position:`, obj.position);
            });
        }
    }

    /**
     * Fix specific contact sync issue by contact name
     * This will create a 3D object for a contact that exists in persistence
     */
    fixContactSync(contactName) {
        console.log(`🔧 Attempting to fix sync for contact: ${contactName}`);
        
        // Check if contact already exists in 3D world
        const existingContact = Array.from(this.contacts.values()).find(contact => 
            contact.contactData.name === contactName
        );
        
        if (existingContact) {
            console.log(`✅ Contact "${contactName}" already exists in 3D world`);
            return existingContact;
        }
        
        // Try to find contact file in fileObjects and create proper contact
        if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
            const fileObjects = window.app.stateManager.fileObjects;
            const contactFile = fileObjects.find(obj => 
                obj.userData && 
                obj.userData.fileName && 
                obj.userData.fileName === `${contactName}.contact`
            );
            
            if (contactFile) {
                console.log(`📱 Found contact file for "${contactName}", creating 3D object`);
                
                // Extract phone number from file metadata or use contact extraction logic
                let extractedPhone = null;
                if (window.PhoneUtils && contactFile.userData) {
                    // Try to extract phone from file userData first
                    extractedPhone = window.PhoneUtils.extractPhoneFromContact(contactFile.userData);
                    
                    // If no phone found in userData, try to extract from filename or contactName
                    if (!extractedPhone) {
                        const flutterFileId = contactFile.userData.fileData?.id || contactFile.userData.id;
                        const phoneFromName = window.PhoneUtils.extractPhoneFromContact({
                            phoneNumber: contactName,
                            fileName: contactFile.userData.fileName,
                            id: flutterFileId
                        });
                        extractedPhone = phoneFromName;
                    }
                }
                
                // CONTACT PHONE NUMBER FIX: No longer providing default phone numbers
                if (!extractedPhone) {
                    console.warn(`📱 ⚠️ Could not extract or determine phone number for ${contactName}`);
                }
                
                // CONTACT ID CONSISTENCY FIX: Use Flutter file ID to ensure JS and Flutter sides match
                const flutterFileId = contactFile.userData.fileData?.id || contactFile.userData.id;
                
                const contactData = {
                    id: flutterFileId || contactName.toLowerCase().replace(/\s+/g, '-'),
                    name: contactName,
                    phoneNumber: extractedPhone || 'Unknown',
                    position: {
                        x: contactFile.position.x,
                        y: contactFile.position.y,
                        z: contactFile.position.z
                    },
                    avatar: null
                };
                
                if (extractedPhone) {
                    console.log(`📱 ✅ Extracted phone number for ${contactName}: ${extractedPhone}`);
                } else {
                    console.warn(`📱 ⚠️ Could not extract phone number for ${contactName}, using 'Unknown'`);
                }
                
                // Create the contact object
                const newContact = this.addContact(contactData);
                
                // Remove the old file object
                const index = fileObjects.indexOf(contactFile);
                if (index > -1) {
                    fileObjects.splice(index, 1);
                    console.log(`📱 Replaced file object with proper contact: ${contactName}`);
                }
                
                // Remove old object from scene
                if (contactFile.parent) {
                    contactFile.parent.remove(contactFile);
                }
                
                return newContact;
            } else {
                console.warn(`❌ No contact file found for "${contactName}"`);
            }
        }
        
        return null;
    }

    /**
     * Sync contact objects with FileModel data
     * This ensures all contact files in the persistence have corresponding 3D objects
     */
    syncContactsWithFiles() {
        console.log('🔄 Syncing contact objects with FileModel data...');
        
        if (!window.app || !window.app.stateManager || !window.app.stateManager.fileObjects) {
            console.warn('📱 State manager not available for contact sync');
            return;
        }
        
        const fileObjects = window.app.stateManager.fileObjects;
        const contactFiles = fileObjects.filter(obj => 
            obj.userData && 
            obj.userData.fileName && 
            obj.userData.fileName.includes('.contact')
        );
        
        console.log(`📱 Found ${contactFiles.length} contact files in fileObjects`);
        
        contactFiles.forEach(contactFileObj => {
            const fileName = contactFileObj.userData.fileName;
            const contactName = fileName.replace('.contact', '');
            
            // CONTACT ID CONSISTENCY FIX: Use Flutter file ID to ensure JS and Flutter sides match
            const flutterFileId = contactFileObj.userData.fileData?.id || contactFileObj.userData.id;
            const contactId = flutterFileId || contactName.toLowerCase().replace(/\s+/g, '-');
            
            const tempContactData = {
                id: contactId,
                name: contactName,
                phoneNumber: 'temp' // temporary for deletion check
            };
            
            if (this.isContactDeleted(tempContactData)) {
                console.log(`📱 Skipping previously deleted contact: ${contactName}`);
                // Remove the file object from scene and fileObjects array since it was deleted
                const index = window.app.stateManager.fileObjects.indexOf(contactFileObj);
                if (index > -1) {
                    window.app.stateManager.fileObjects.splice(index, 1);
                    console.log(`📱 Removed deleted contact file object: ${contactName}`);
                }
                if (contactFileObj.parent) {
                    contactFileObj.parent.remove(contactFileObj);
                }
                return; // Skip creating this contact
            }
            
            // Check if this contact already exists in ContactManager
            const existingContact = Array.from(this.contacts.values()).find(contact => 
                contact.contactData.name === contactName
            );
            
            if (!existingContact) {
                console.log(`📱 Found orphaned contact file: ${contactName} - creating 3D object`);
                
                // POSITION PERSISTENCE FIX: Store the preserved position
                const preservedPosition = {
                    x: contactFileObj.position.x,
                    y: contactFileObj.position.y, 
                    z: contactFileObj.position.z
                };
                
                console.log(`📱 Preserving contact position: ${contactName} at (${preservedPosition.x}, ${preservedPosition.y}, ${preservedPosition.z})`);
                
                // Extract phone number from file metadata or contact data
                let extractedPhone = null;
                if (window.PhoneUtils && contactFileObj.userData) {
                    // Try to extract phone from file userData first
                    extractedPhone = window.PhoneUtils.extractPhoneFromContact(contactFileObj.userData);
                    
                    // If no phone found in userData, try to extract from filename or contactName
                    if (!extractedPhone) {
                        const flutterFileId = contactFileObj.userData.fileData?.id || contactFileObj.userData.id;
                        const phoneFromName = window.PhoneUtils.extractPhoneFromContact({
                            phoneNumber: contactName,
                            fileName: contactFileObj.userData.fileName,
                            id: flutterFileId
                        });
                        extractedPhone = phoneFromName;
                    }
                }
                
                // CONTACT PHONE NUMBER FIX: No longer providing default phone numbers
                if (!extractedPhone) {
                    console.warn(`📱 ⚠️ Could not extract or determine phone number for ${contactName}`);
                }
                
                // Extract contact data from file object
                const contactData = {
                    id: flutterFileId || contactName.toLowerCase().replace(/\s+/g, '-'),
                    name: contactName,
                    phoneNumber: extractedPhone || 'Unknown',
                    position: preservedPosition,
                    avatar: null
                };
                
                if (extractedPhone) {
                    console.log(`📱 ✅ Extracted phone number for ${contactName}: ${extractedPhone}`);
                } else {
                    console.warn(`📱 ⚠️ Could not extract phone number for ${contactName}, using 'Unknown'`);
                }
                
                // Create the contact object via ContactManager
                const newContact = this.addContact(contactData);
                
                // POSITION & MATERIAL PERSISTENCE FIX: Apply preserved position, userData, and materials
                if (newContact && newContact.mesh) {
                    // Set the exact preserved position
                    newContact.mesh.position.set(preservedPosition.x, preservedPosition.y, preservedPosition.z);

                    // Copy userData from file object (but preserve contact-specific userData)
                    const contactUserData = newContact.mesh.userData || {};
                    const fileUserData = contactFileObj.userData || {};
                    newContact.mesh.userData = Object.assign({}, fileUserData, contactUserData);

                    // DO NOT overwrite materials - let contact keep its proper face texture
                    // The contact object already has the correct materials with face texture applied

                    // Mark as manually positioned to prevent auto-sorting
                    newContact.mesh.userData.preservePosition = true;
                    newContact.mesh.userData.preservePositionWorldType = window.app?.currentWorldTemplate?.getType() || 'unknown';
                    newContact.mesh.userData.lastManualPosition = {
                        x: preservedPosition.x,
                        y: preservedPosition.y,
                        z: preservedPosition.z,
                        timestamp: Date.now()
                    };

                    console.log(`📱 Contact position preserved and marked: ${contactName} at (${preservedPosition.x}, ${preservedPosition.y}, ${preservedPosition.z})`);
                }

                // Remove the old file object and replace with proper contact
                const index = fileObjects.indexOf(contactFileObj);
                if (index > -1) {
                    fileObjects.splice(index, 1);
                    console.log(`📱 Replaced file object with proper contact: ${contactName}`);
                }

                // Remove old object from scene
                if (contactFileObj.parent) {
                    contactFileObj.parent.remove(contactFileObj);
                }
            }
        });
        
        console.log('✅ Contact sync completed');
    }
    
    /**
     * Dispose all contacts
     */
    dispose() {
        this.contacts.forEach(contact => {
            contact.dispose();
        });
        this.contacts.clear();
        this.activeContactId = null;
        
        console.log('📱 Contact Manager disposed');
    }
    
    /**
     * Notify Flutter about contact deletion for undo snackbar AND menu sync
     */
    notifyFlutterContactDeleted(contactId, contactName) {
        console.log('📱 Notifying Flutter about contact deletion:', contactId, contactName);
        
        // PHASE 1: Notify Flutter StateManager to remove contact file (like app system)
        this.notifyFlutterRemoveContactFile(contactId, contactName);
        
        // Send via message channel if available
        if (window.ObjectActionChannel && window.ObjectActionChannel.postMessage) {
            try {
                window.ObjectActionChannel.postMessage(JSON.stringify({
                    action: 'objectDeleted',
                    id: contactId,
                    name: contactName
                }));
                console.log('📱 Flutter notified via ObjectActionChannel about contact deletion');
                return;
            } catch (e) {
                console.warn('📱 Error notifying Flutter via ObjectActionChannel:', e);
            }
        }
        
        // Fallback: Set window flag for Flutter to detect
        window.lastDeletedContact = {
            id: contactId,
            name: contactName,
            timestamp: Date.now()
        };
        console.log('📱 Set window.lastDeletedContact for Flutter detection');
    }
    
    /**
     * Notify Flutter to remove contact file from StateManager (mirrors app system)
     * This ensures contact deletion in 3D world syncs back to Flutter menu state
     */
    notifyFlutterRemoveContactFile(contactId, contactName) {
        console.log('📱 Notifying Flutter to remove contact file for menu sync:', contactId, contactName);
        
        // Try multiple communication channels like app system does
        const contactFilePath = `contact://${contactId}`;
        
        // Method 1: Direct Flutter call if available
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            try {
                window.flutter_inappwebview.callHandler('removeContactFile', {
                    contactId: contactId,
                    contactName: contactName,
                    filePath: contactFilePath
                }).then(() => {
                    console.log('📱 Flutter StateManager notified to remove contact file via callHandler');
                }).catch(err => {
                    console.warn('📱 Error notifying Flutter via callHandler:', err);
                    this.notifyFlutterRemoveContactFileFallback(contactId, contactName);
                });
                return;
            } catch (e) {
                console.warn('📱 Error with Flutter callHandler, trying fallback:', e);
            }
        }
        
        // Method 2: Fallback communication
        this.notifyFlutterRemoveContactFileFallback(contactId, contactName);
    }
    
    /**
     * Fallback method to notify Flutter about contact file removal
     */
    notifyFlutterRemoveContactFileFallback(contactId, contactName) {
        // Set window flags for Flutter to detect and process
        window.lastDeletedContactForMenuSync = {
            id: contactId,
            name: contactName,
            filePath: `contact://${contactId}`,
            action: 'removeFromStateManager',
            timestamp: Date.now()
        };
        
        // Also try posting to channel if available
        if (window.ContactMenuSyncChannel && window.ContactMenuSyncChannel.postMessage) {
            try {
                window.ContactMenuSyncChannel.postMessage(JSON.stringify({
                    action: 'removeContactFile',
                    id: contactId,
                    name: contactName,
                    filePath: `contact://${contactId}`
                }));
                console.log('📱 Flutter notified via ContactMenuSyncChannel about contact file removal');
            } catch (e) {
                console.warn('📱 Error notifying Flutter via ContactMenuSyncChannel:', e);
            }
        }
        
        console.log('📱 Set window.lastDeletedContactForMenuSync for Flutter detection');
    }
    
    /**
     * Notify Flutter about contact restoration for menu sync (mirrors app system)
     */
    notifyFlutterContactRestored(contactId, contactName) {
        console.log('📱 Notifying Flutter about contact restoration for menu sync:', contactId, contactName);
        
        const contactFilePath = `contact://${contactId}`;
        
        // Method 1: Direct Flutter call if available
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            try {
                window.flutter_inappwebview.callHandler('addContactFile', {
                    contactId: contactId,
                    contactName: contactName,
                    filePath: contactFilePath
                }).then(() => {
                    console.log('📱 Flutter StateManager notified to add contact file via callHandler');
                }).catch(err => {
                    console.warn('📱 Error notifying Flutter via callHandler:', err);
                    this.notifyFlutterContactRestoredFallback(contactId, contactName);
                });
                return;
            } catch (e) {
                console.warn('📱 Error with Flutter callHandler, trying fallback:', e);
            }
        }
        
        // Method 2: Fallback communication
        this.notifyFlutterContactRestoredFallback(contactId, contactName);
    }
    
    /**
     * Fallback method to notify Flutter about contact restoration
     */
    notifyFlutterContactRestoredFallback(contactId, contactName) {
        // Set window flags for Flutter to detect and process
        window.lastRestoredContactForMenuSync = {
            id: contactId,
            name: contactName,
            filePath: `contact://${contactId}`,
            action: 'addToStateManager',
            timestamp: Date.now()
        };
        
        // Also try posting to channel if available
        if (window.ContactMenuSyncChannel && window.ContactMenuSyncChannel.postMessage) {
            try {
                window.ContactMenuSyncChannel.postMessage(JSON.stringify({
                    action: 'addContactFile',
                    id: contactId,
                    name: contactName,
                    filePath: `contact://${contactId}`
                }));
                console.log('📱 Flutter notified via ContactMenuSyncChannel about contact file addition');
            } catch (e) {
                console.warn('📱 Error notifying Flutter via ContactMenuSyncChannel:', e);
            }
        }
        
        console.log('📱 Set window.lastRestoredContactForMenuSync for Flutter detection');
    }
    /**
     * POSITION PERSISTENCE FIX: Store current contact positions
     * Called before file operations that might clear contacts
     */
    storeContactPositions() {
        console.log('📱 POSITION PERSISTENCE: Storing contact positions');
        
        const positions = new Map();
        const currentWorldType = window.app?.currentWorldTemplate?.getType() || 'unknown';
        
        this.contacts.forEach((contact, contactId) => {
            if (contact && contact.mesh) {
                const position = {
                    x: contact.mesh.position.x,
                    y: contact.mesh.position.y,
                    z: contact.mesh.position.z,
                    zone: this.determineContactZone(contact.mesh.position),
                    worldType: currentWorldType,
                    timestamp: Date.now()
                };
                
                positions.set(contactId, position);
                console.log(`📱 Stored position for contact ${contact.contactData?.name || contactId} in world ${currentWorldType}:`, position);
            }
        });
        
        console.log(`📱 POSITION PERSISTENCE: Stored positions for ${positions.size} contacts`);
        return positions;
        return positions;
    }
    
    /**
     * POSITION PERSISTENCE FIX: Restore contact positions
     * Called after file operations to restore contact positions
     */
    restoreContactPositions(storedPositions) {
        console.log('📱 POSITION PERSISTENCE: Restoring contact positions from stored data');
        
        let restoredCount = 0;
        const currentWorldType = window.app?.currentWorldTemplate?.getType() || 'unknown';
        
        storedPositions.forEach((position, contactId) => {
            const contact = this.contacts.get(contactId);
            if (contact && contact.mesh) {
                // Restore position
                contact.mesh.position.set(position.x, position.y, position.z);
                
                // Mark as manually positioned to prevent auto-sorting
                if (!contact.mesh.userData) contact.mesh.userData = {};
                
                // SMART POSITION PRESERVATION: Only preserve position if it was set in the same world type
                const savedWorldType = position.worldType || 'unknown';
                const shouldPreservePosition = (savedWorldType === currentWorldType);
                
                console.log(`📱 SMART RESTORE: Contact ${contactId} saved in ${savedWorldType}, current world ${currentWorldType}, preserve=${shouldPreservePosition}`);
                
                contact.mesh.userData.preservePosition = shouldPreservePosition;
                contact.mesh.userData.preservePositionWorldType = currentWorldType;
                contact.mesh.userData.sortingZone = position.zone;
                contact.mesh.userData.lastManualPosition = {
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    timestamp: position.timestamp
                };
                
                restoredCount++;
                console.log(`📱 Restored contact ${contact.contactData?.name || contactId} to zone ${position.zone}`);
            } else {
                console.warn(`📱 Could not restore position for contact ${contactId} - contact not found`);
            }
        });
        
        console.log(`✅ POSITION PERSISTENCE: Restored positions for ${restoredCount}/${storedPositions.size} contacts`);
        
        // APPLY GRAVITY: After contact restoration, apply gravity to contacts that don't preserve position
        if (currentWorldType !== 'forest' && typeof window.applyGravityToFloatingObjects === 'function') {
            console.log('📱 Applying gravity to non-preserved contacts after restoration');
            setTimeout(() => {
                if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
                    window.applyGravityToFloatingObjects();
                }
            }, 100); // Small delay to ensure all objects are fully restored
        }
    }
    
    /**
     * Persist contact position to file system (for auto-sorting)
     * This ensures contacts maintain their positions when exiting/entering the world
     */
    persistContactPosition(contactId, position, zone = null) {
        console.log(`📱 PERSIST CONTACT POSITION DEBUG:`);
        console.log(`   📱 ContactManager.persistContactPosition called for: ${contactId}`);
        console.log(`   📱 Position:`, position);
        
        const contact = this.contacts.get(contactId);
        if (!contact) {
            console.warn(`📱 Contact ${contactId} not found for position persistence`);
            return;
        }
        
        console.log(`   📱 Contact found: ${contact.contactData?.name}`);
        console.log(`   📱 Contact mesh userData.id: ${contact.mesh?.userData?.id}`);
        console.log(`   📱 Contact mesh userData.contactId: ${contact.mesh?.userData?.contactId}`);
        console.log(`   📱 Contact mesh userData.fileId: ${contact.mesh?.userData?.fileId}`);
        
        // Update the contact mesh userData to mark it as positioned
        if (contact.mesh) {
            if (!contact.mesh.userData) contact.mesh.userData = {};
            contact.mesh.userData.preservePosition = true;
            contact.mesh.userData.preservePositionWorldType = window.app?.currentWorldTemplate?.getType() || 'unknown';
            contact.mesh.userData.lastManualPosition = {
                x: position.x,
                y: position.y,
                z: position.z,
                timestamp: Date.now()
            };
            
            if (zone) {
                contact.mesh.userData.sortingZone = zone;
            }
        }
        
        // Update the contact object's position data
        contact.contactData.position = {
            x: position.x,
            y: position.y,
            z: position.z
        };
        
        // Persist to file system via Flutter bridge
        try {
            const positionData = {
                contactId: contactId,
                fileName: contact.contactData.name + '.contact',
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                zone: zone || this.determineContactZone(position),
                timestamp: Date.now()
            };
            
            // Use ObjectMovedChannel like regular objects for position persistence
            if (window.ObjectMovedChannel) {
                const moveData = {
                    id: `contact://${contactId}`,  // Use contact:// prefix to identify contact objects
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    type: 'contact',
                    zone: zone || this.determineContactZone(position),
                    timestamp: Date.now()
                };
                
                console.log(`   📱 ContactManager sending ObjectMovedChannel with contact:// prefix:`);
                console.log(`   📱 Message:`, JSON.stringify(moveData));
                
                window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                console.log(`   📱 ContactManager ObjectMovedChannel message sent successfully`);
            } else if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                // Fallback to original Flutter bridge method
                window.flutter_inappwebview.callHandler('updateContactPosition', positionData)
                    .then(result => {
                        console.log(`📱 Contact position persisted via flutter_inappwebview for ${contactId}:`, result);
                    })
                    .catch(error => {
                        console.warn(`📱 Failed to persist contact position via flutter_inappwebview for ${contactId}:`, error);
                    });
            } else if (window.contactPositionChannel && window.contactPositionChannel.postMessage) {
                // Fallback for different Flutter bridge setup
                window.contactPositionChannel.postMessage(JSON.stringify({
                    action: 'updateContactPosition',
                    data: positionData
                }));
                console.log(`📱 Contact position persisted via contactPositionChannel for ${contactId}`);
            } else {
                console.warn(`📱 No persistence channels available for contact ${contactId}, storing position locally only`);
            }
            
        } catch (error) {
            console.warn(`📱 Error persisting contact position for ${contactId}:`, error);
        }
    }
    
    /**
     * Handle contact auto-sorting position updates
     * This should be called when contacts are moved during auto-sorting
     */
    handleContactAutoSort(contactId, newPosition, zone) {
        console.log(`📱 Contact auto-sorted: ${contactId} to zone ${zone}`, newPosition);
        
        // Persist the new position
        this.persistContactPosition(contactId, newPosition, zone);
        
        // Update SMS screen position if needed
        const contact = this.contacts.get(contactId);
        if (contact && contact.smsScreen && contact.smsScreen.isVisible) {
            console.log(`📱 Updating SMS screen position after auto-sort for ${contactId}`);
            contact.updateSMSScreenPosition();
        }
    }
    
    /**
     * Determine which sorting zone a contact is in based on position
     */
    determineContactZone(position) {
        // Simple zone determination based on position
        // This is a basic implementation - could be enhanced based on actual sorting zones
        const distance = Math.sqrt(position.x * position.x + position.z * position.z);
        
        if (distance < 15) {
            return 'home';
        } else if (position.x > 0 && position.z > 0) {
            return 'northeast';
        } else if (position.x > 0 && position.z < 0) {
            return 'southeast';
        } else if (position.x < 0 && position.z > 0) {
            return 'northwest';
        } else {
            return 'southwest';
        }
    }
    

}

// Global contact manager instance
let globalContactManager = null;

/**
 * Initialize contact manager
 */
function initializeContactManager(scene) {
    if (!globalContactManager) {
        globalContactManager = new window.ContactManagerClass(scene);
        
        // Also attach to window.app if available
        if (window.app) {
            window.app.contactManager = globalContactManager;
            console.log('📱 ContactManager attached to window.app');
            
            // Sync contact files with 3D objects after initialization
            setTimeout(() => {
                globalContactManager.syncContactsWithFiles();
            }, 500);
        }
    }
    return globalContactManager;
}

/**
 * Get global contact manager
 */
window.getContactManager = function() {
    return globalContactManager;
}

/**
 * Global function to handle object deletion - checks if it's a contact
 * This should be called by the deletion system before removing any object
 */
window.handleObjectDeletion = function(objectId, objectData) {
    console.log('🗑️ Global object deletion handler called for:', objectId);
    
    // Check if this is a contact object
    if (objectData && (
        (objectData.userData && objectData.userData.subType === 'contact') ||
        (objectData.userData && objectData.userData.isContact) ||
        (objectData.userData && objectData.userData.contactId) ||
        (objectId && objectId.includes('contact')) ||
        (objectData.fileName && objectData.fileName.includes('.contact'))
    )) {
        console.log('📱 Contact deletion detected, delegating to ContactManager');
        
        const contactManager = window.getContactManager();
        if (contactManager) {
            const contactId = objectData.userData?.contactId || objectData.userData?.id || objectId;
            contactManager.handleContactDeletion(contactId);
        }
    }
};

/**
 * Global function to handle object restoration - checks if it's a contact
 * This should be called by the restoration system when restoring any object
 */
window.handleObjectRestoration = function(objectId, objectData) {
    console.log('🔄 Global object restoration handler called for:', objectId);
    
    // Check if this is a contact object
    if (objectData && (
        (objectData.userData && objectData.userData.subType === 'contact') ||
        (objectData.userData && objectData.userData.isContact) ||
        (objectData.userData && objectData.userData.contactId) ||
        (objectId && objectId.includes('contact')) ||
        (objectData.fileName && objectData.fileName.includes('.contact')) ||
        (objectData.extension === '.contact')
    )) {
        console.log('📱 Contact restoration detected, delegating to ContactManager');
        
        const contactManager = window.getContactManager();
        if (contactManager) {
            const contactId = objectData.userData?.contactId || objectData.userData?.id || objectData.id || objectId;
            // Delay restoration to ensure contact is fully created
            setTimeout(() => {
                contactManager.restoreContactSMSScreen(contactId);
            }, 200);
        }
    }
};

// Initialize contact manager when called
window.initializeContactManager = initializeContactManager;

/**
 * Global Flutter bridge handlers for contact menu synchronization
 * These mirror the app system's communication patterns
 */

/**
 * Handler for Flutter to get current contact files (fixes missing getContactFiles)
 */
window.getContactFiles = function() {
    console.log('📱 Flutter requesting contact files for menu sync');
    
    const contactManager = window.getContactManager();
    if (!contactManager) {
        console.warn('📱 ContactManager not available for getContactFiles');
        return [];
    }
    
    return contactManager.getContactFilesForMenuSync();
};

/**
 * Handler for Flutter to check if specific contact is active in 3D world
 */
window.isContactActive = function(contactId) {
    const contactManager = window.getContactManager();
    if (!contactManager) {
        return false;
    }
    
    return contactManager.isContactActive(contactId);
};

/**
 * Handler for Flutter to get active contact names for menu validation
 */
window.getActiveContactNames = function() {
    const contactManager = window.getContactManager();
    if (!contactManager) {
        return [];
    }
    
    return contactManager.getActiveContactNames();
};

/**
 * Enhanced contact sync debugging with menu state validation
 */
window.debugContactMenuSync = function() {
    console.log('🔍 DEBUG: Contact menu synchronization analysis...');
    
    const contactManager = window.getContactManager();
    if (!contactManager) {
        console.warn('📱 ContactManager not available');
        return;
    }
    
    const activeContacts = contactManager.getContactFilesForMenuSync();
    console.log('📱 Active 3D contacts:', activeContacts);
    
    // Check for window sync flags
    if (window.lastDeletedContactForMenuSync) {
        console.log('📱 Pending deletion sync:', window.lastDeletedContactForMenuSync);
    }
    
    if (window.lastRestoredContactForMenuSync) {
        console.log('📱 Pending restoration sync:', window.lastRestoredContactForMenuSync);
    }
    
    return {
        activeContacts,
        pendingDeletion: window.lastDeletedContactForMenuSync || null,
        pendingRestoration: window.lastRestoredContactForMenuSync || null,
        syncStatus: 'Available for Flutter menu sync'
    };
};
