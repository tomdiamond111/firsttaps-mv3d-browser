/**
 * CONTACT CUSTOMIZATION MANAGER
 * Manages avatar customization for contact objects including UI and data persistence
 */

class ContactCustomizationManager {
    constructor(app) {
        this.app = app;
        this.avatarGenerator = new window.AvatarGenerator();
        this.customizationData = new Map(); // Store customization data per contact
        this.activeAvatars = new Map(); // Store active avatar meshes per contact
        this.isLoading = false; // Add loading flag to prevent saves during load
        
        // UI elements
        this.customizationUI = null;
        this.isUIOpen = false;
        this.currentContactId = null;
        
        // Load saved customizations first, then set up monitoring
        this.initializeAsync();
    }
    
    /**
     * Async initialization to ensure proper load order
     */
    async initializeAsync() {
        try {
            // Load saved customizations from localStorage FIRST
            await this.loadCustomizations();
            
            // Enhanced initialization for app restart persistence
            this.initializeAppRestartPersistence();
            
            // Add test debugging for localStorage behavior
            this.testLocalStorageBehavior();
            
            // Set up Flutter avatar data rehydration listener (Fix #3 from expert advice)
            this.setupFlutterAvatarDataListener();
            
            // ONLY AFTER loading is complete, set up persistence monitoring
            this.setupPersistenceMonitoring();
        } catch (error) {
            console.error('👤 Error during async initialization:', error);
        }
    }
    
    /**
     * Set up Flutter avatar data rehydration listener (Fix #3 from expert advice)
     */
    setupFlutterAvatarDataListener() {
        // Listen for avatar data sent from Flutter after app restart
        window.addEventListener('flutter-avatar-data', (event) => {
            try {
                const customizations = event.detail?.customizations;
                if (customizations) {
                    // Parse and store the data
                    const data = typeof customizations === 'string' ? JSON.parse(customizations) : customizations;
                    this.customizationData = new Map(Object.entries(data));
                    
                    // Save to localStorage for consistency
                    localStorage.setItem('contactAvatarCustomizations', JSON.stringify(data));
                    
                    // Apply avatars to existing contacts
                    this.applyCustomizationsToContacts(data);
                }
            } catch (error) {
                console.error('👤 [FLUTTER REHYDRATE] Error processing Flutter avatar data:', error);
            }
        });
        
        // Also set up enhanced callbacks for Flutter bridge (Fix #4 from expert advice)
        window.avatarLoadCallback = (data) => {
            try {
                if (data && data !== 'null') {
                    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                    this.customizationData = new Map(Object.entries(parsedData));
                    localStorage.setItem('contactAvatarCustomizations', typeof data === 'string' ? data : JSON.stringify(data));
                    this.applyCustomizationsToContacts(parsedData);
                }
            } catch (error) {
                console.error('👤 [BRIDGE CALLBACK] Error in avatar load callback:', error);
            }
        };
    }

    /**
     * Set up monitoring to ensure data persistence
     * DISABLED: Causing excessive log spam
     */
    setupPersistenceMonitoring() {
        // DISABLED: This was causing excessive saves every 30 seconds
        console.log('👤 [PERSISTENCE] Persistence monitoring disabled to reduce log spam');
        /*
        // Check every 30 seconds that our data is still saved
        this.persistenceInterval = setInterval(() => {
            if (this.customizationData.size > 0) {
                const stored = localStorage.getItem('contactAvatarCustomizations');
                if (!stored || stored === 'null') {
                    console.warn('👤 [PERSISTENCE] Data lost from localStorage, restoring...');
                    this.saveCustomizations();
                } else {
                    // Verify the data integrity
                    try {
                        const storedData = JSON.parse(stored);
                        const currentData = Object.fromEntries(this.customizationData);
                        const storedKeys = Object.keys(storedData).length;
                        const currentKeys = Object.keys(currentData).length;
                        
                        if (storedKeys !== currentKeys) {
                            console.warn('👤 [PERSISTENCE] Data mismatch detected, re-saving...');
                            this.saveCustomizations();
                        }
                    } catch (e) {
                        console.warn('👤 [PERSISTENCE] Corrupted data detected, re-saving...');
                        this.saveCustomizations();
                    }
                }
            }
        }, 30000); // Check every 30 seconds
        
        // Also check when the page is about to unload
        window.addEventListener('beforeunload', () => {
            if (this.customizationData.size > 0) {
                this.saveCustomizations();
            }
        });
        
        // Check when the page becomes visible again (mobile app switching)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.customizationData.size > 0) {
                const stored = localStorage.getItem('contactAvatarCustomizations');
                if (!stored || stored === 'null') {
                    this.saveCustomizations();
                }
            }
        });
        */
    }
    
    /**
     * Test localStorage behavior to diagnose persistence issues
     */
    testLocalStorageBehavior() {
        // Removed extensive debugging - only test if needed for troubleshooting
    }
    
    // Static instance for singleton pattern
    static instance = null;
    
    // Static initialization method that matches the expected pattern
    static initialize(THREE, scene, camera) {
        if (!ContactCustomizationManager.instance) {
            // Create a mock app object with the necessary properties
            const mockApp = { THREE, scene, camera };
            ContactCustomizationManager.instance = new ContactCustomizationManager(mockApp);
        }
        return ContactCustomizationManager.instance;
    }
    
    // Static method to show customization menu
    static showCustomizationMenu(contactId, contactData) {
        if (!ContactCustomizationManager.instance) {
            console.error('👤 ContactCustomizationManager not initialized');
            return false;
        }
        return ContactCustomizationManager.instance.showCustomizationMenu(contactId, contactData);
    }

    /**
     * Show customization menu for a contact
     * @param {string} contactId - The contact ID to customize
     * @param {Object} contactData - Contact data including name, phone, etc.
     */
    showCustomizationMenu(contactId, contactData) {
        console.log('👤 [MANAGER DEBUG] showCustomizationMenu called with:');
        console.log('👤 [MANAGER DEBUG] - contactId:', contactId, 'type:', typeof contactId);
        console.log('👤 [MANAGER DEBUG] - contactData:', contactData);

        // Special handling for explore avatar
        if (contactId === 'EXPLORE_AVATAR') {
            console.log('🎨 [EXPLORE AVATAR] Handling explore avatar customization');
            // Ensure we have proper contactData for explore avatar
            if (!contactData || !contactData.name) {
                contactData = {
                    name: 'Explore Avatar',
                    id: 'EXPLORE_AVATAR',
                    object: null // No actual contact object for explore avatar
                };
            }
        }

        if (this.isUIOpen) {
            console.log('👤 [MANAGER DEBUG] Menu already open, hiding first');
            this.hideCustomizationMenu();
            // After hiding, re-open the menu
            // Use setTimeout to ensure DOM updates before re-opening
            setTimeout(() => {
                this.showCustomizationMenu(contactId, contactData);
            }, 0);
            return;
        }

        // Store the contact ID and data
        this.currentContactId = contactId;
        this.isUIOpen = true;

        console.log('👤 [MANAGER DEBUG] Stored currentContactId:', this.currentContactId);

        // Create overlay
        this.createOverlay();

        // Create customization UI
        this.createCustomizationUI(contactData);

        // Prevent touch/click events from propagating to the 3D scene
        this.blockSceneInteraction();
    }

    /**
     * Hide the customization menu
     */
    hideCustomizationMenu() {
        if (!this.isUIOpen) return;

        this.isUIOpen = false;
        this.currentContactId = null;
        
        // Remove UI elements safely
        if (this.customizationUI && this.customizationUI.parentNode) {
            this.customizationUI.parentNode.removeChild(this.customizationUI);
            this.customizationUI = null;
        }
        
        // Remove overlay safely
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
        
        // Restore scene interaction
        this.unblockSceneInteraction();
    }

    /**
     * Check if the customization menu is currently open
     */
    isMenuOpen() {
        return this.customizationUI !== null && this.overlay !== null;
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
            align-items: flex-start;
            padding-top: 20px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hideCustomizationMenu();
            }
        });
        
        // Prevent touch events from reaching the 3D scene
        this.overlay.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        this.overlay.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        this.overlay.addEventListener('touchend', (e) => {
            e.stopPropagation();
        }, { passive: true });

        document.body.appendChild(this.overlay);
    }

    /**
     * NEW: Public method to get customization HTML for delegation
     */
    getCustomizationHTML(config, contactData) {
        const contactName = contactData?.name || 'Explore Avatar';
        const contactId = this.currentContactId || 'exploreAvatar';

        const html = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0 0 10px 0; color: #333;">Customize Avatar</h2>
                <p style="margin: 0; color: #666; font-size: 14px;">${contactName}</p>
            </div>
            
            <div id="avatar-preview-${contactId}" style="text-align: center; margin-bottom: 20px; height: 200px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <!-- Preview content will be injected here -->
            </div>
            
            <div id="customizationOptions">
                ${this.createHairSection(config)}
                ${this.createSkinToneSection(config)}
                ${this.createAgeSection(config)}
                ${this.createGenderSection(config)}
                ${this.createClothingSection(config)}
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                <button id="reset-btn-${contactId}" style="padding: 12px 20px; background: #ff6b6b; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">Reset</button>
                <button id="cancel-btn-${contactId}" style="padding: 12px 20px; background: #666; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">Cancel</button>
                <button id="done-btn-${contactId}" style="padding: 12px 20px; background: #4caf50; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">Done</button>
            </div>
        `;

        const previewHTML = `<div style="color: #888;">Loading preview...</div>`;

        return { html, previewHTML };
    }

    /**
     * Create the main customization UI
     */
    createCustomizationUI(contactData) {
        this.customizationUI = document.createElement('div');
        this.customizationUI.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            position: relative;
            z-index: 1001;
        `;

        // Add touch event handlers to prevent 3D scene interference
        this.customizationUI.addEventListener('touchstart', (e) => {
            e.stopPropagation(); // Prevent InputManager from handling this
        }, { passive: true });
        
        this.customizationUI.addEventListener('touchmove', (e) => {
            e.stopPropagation(); // Prevent InputManager from handling this
        }, { passive: true });
        
        this.customizationUI.addEventListener('touchend', (e) => {
            e.stopPropagation(); // Prevent InputManager from handling this
        }, { passive: true });

        // Get current customization or use defaults
        const currentConfig = this.getContactCustomization(this.currentContactId);
        
        // Handle case where contactData might be null or undefined
        const contactName = contactData?.name || 'Contact';
        
        const { html, previewHTML } = this.getCustomizationHTML(currentConfig, contactData);
        
        this.customizationUI.innerHTML = html;
        this.overlay.appendChild(this.customizationUI);

        const previewContainer = this.customizationUI.querySelector(`#avatar-preview-${this.currentContactId}`);
        if (previewContainer) {
            previewContainer.innerHTML = previewHTML;
        }
        
        // Add event listeners
        this.setupAvatarEventListeners(this.customizationUI, currentConfig, this.currentContactId);
        
        // Create initial preview
        this.updateAvatarPreview(currentConfig, this.currentContactId);
    }

    /**
     * Create hair customization section
     */
    createHairSection(currentConfig) {
        const hairStyles = window.AvatarStyles.HAIR_STYLES;
        const hairColors = window.AvatarStyles.HAIR_COLORS;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Hair</h3>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Style:</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${Object.entries(hairStyles).map(([key, style]) => `
                            <button class="hair-style-btn" data-style="${key}" 
                                style="padding: 8px 12px; border: 2px solid ${currentConfig.hair === key ? '#4caf50' : '#ddd'}; 
                                background: ${currentConfig.hair === key ? '#e8f5e8' : 'white'}; border-radius: 4px; cursor: pointer; font-size: 14px;">
                                ${style.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Color:</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${Object.entries(hairColors).map(([key, color]) => `
                            <button class="hair-color-btn" data-color="${key}"
                                style="width: 40px; height: 40px; border: 3px solid ${currentConfig.hairColor === key ? '#333' : '#ddd'}; 
                                background-color: #${color.color.toString(16).padStart(6, '0')}; border-radius: 50%; cursor: pointer;">
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create skin tone section
     */
    createSkinToneSection(currentConfig) {
        const skinTones = window.AvatarStyles.SKIN_TONES;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Skin Tone</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${Object.entries(skinTones).map(([key, tone]) => `
                        <button class="skin-tone-btn" data-tone="${key}"
                            style="width: 50px; height: 50px; border: 3px solid ${currentConfig.skinTone === key ? '#333' : '#ddd'}; 
                            background-color: #${tone.color.toString(16).padStart(6, '0')}; border-radius: 8px; cursor: pointer;
                            display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                            ${tone.name.charAt(0)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Create age section
     */
    createAgeSection(currentConfig) {
        const ageCategories = window.AvatarStyles.AGE_CATEGORIES;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Age</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${Object.entries(ageCategories).map(([key, age]) => `
                        <button class="age-btn" data-age="${key}"
                            style="padding: 8px 12px; border: 2px solid ${currentConfig.age === key ? '#4caf50' : '#ddd'}; 
                            background: ${currentConfig.age === key ? '#e8f5e8' : 'white'}; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            ${age.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Create gender section
     */
    createGenderSection(currentConfig) {
        const genderStyles = window.AvatarStyles.GENDER_STYLES;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Gender</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${Object.entries(genderStyles).map(([key, gender]) => `
                        <button class="gender-btn" data-gender="${key}"
                            style="padding: 8px 12px; border: 2px solid ${currentConfig.gender === key ? '#4caf50' : '#ddd'}; 
                            background: ${currentConfig.gender === key ? '#e8f5e8' : 'white'}; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            ${gender.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Create clothing section
     */
    createClothingSection(currentConfig) {
        const clothingThemes = window.AvatarStyles.CLOTHING_THEMES;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Clothing Theme</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${Object.entries(clothingThemes).map(([key, clothing]) => `
                        <button class="clothing-btn" data-clothing="${key}"
                            style="padding: 8px 12px; border: 2px solid ${currentConfig.clothing === key ? '#4caf50' : '#ddd'}; 
                            background: ${currentConfig.clothing === key ? '#e8f5e8' : 'white'}; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            ${clothing.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * NEW: Public method to set up event listeners for delegation
     */
    setupAvatarEventListeners(uiElement, initialConfig, contactId) {
        let config = { ...initialConfig };

        const setupButtonListeners = (selector, dataKey, configKey) => {
            uiElement.querySelectorAll(selector).forEach(btn => {
                btn.addEventListener('click', () => {
                    uiElement.querySelectorAll(selector).forEach(b => {
                        const isColor = b.classList.contains('hair-color-btn') || b.classList.contains('skin-tone-btn');
                        b.style.border = isColor ? '3px solid #ddd' : '2px solid #ddd';
                        if (!isColor) b.style.background = 'white';
                    });
                    
                    const isColorButton = btn.classList.contains('hair-color-btn') || btn.classList.contains('skin-tone-btn');
                    btn.style.border = isColorButton ? '3px solid #333' : '2px solid #4caf50';
                    if (!isColorButton) btn.style.background = '#e8f5e8';

                    config[configKey] = btn.dataset[dataKey];
                    this.updateAvatarPreview(config, contactId);
                });
            });
        };

        setupButtonListeners('.hair-style-btn', 'style', 'hair');
        setupButtonListeners('.hair-color-btn', 'color', 'hairColor');
        setupButtonListeners('.skin-tone-btn', 'tone', 'skinTone');
        setupButtonListeners('.age-btn', 'age', 'age');
        setupButtonListeners('.gender-btn', 'gender', 'gender');
        setupButtonListeners('.clothing-btn', 'clothing', 'clothing');

        // Action buttons are handled differently for delegation
        const resetButton = uiElement.querySelector(`#reset-btn-${contactId}`);
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                config = { ...window.AvatarStyles.DEFAULT_AVATAR };
                this.updateAvatarPreview(config, contactId);
                this.updateUISelections(uiElement, config);
            });
        }

        // The 'Done' and 'Cancel' buttons are NOT handled here.
        // The calling manager is responsible for adding its own listeners
        // to the #done-btn-{contactId} and #cancel-btn-{contactId} elements.
        // This is the core of the delegation pattern.

        // If this is NOT a delegated call (i.e., it's the contact manager itself)
        if (contactId === this.currentContactId) {
            const doneButton = uiElement.querySelector(`#done-btn-${contactId}`);
            if (doneButton) {
                doneButton.addEventListener('click', () => {
                    const finalConfig = this.readConfigFromUI(uiElement);
                    this.saveContactCustomization(contactId, finalConfig);
                    this.updateContactAvatar(contactId);
                    this.hideCustomizationMenu();
                });
            }

            const cancelButton = uiElement.querySelector(`#cancel-btn-${contactId}`);
            if (cancelButton) {
                cancelButton.addEventListener('click', () => this.hideCustomizationMenu());
            }
        }
    }

    /**
     * NEW: Public method to read the current config from the UI state
     */
    readConfigFromUI(uiElement) {
        const config = {};
        const selectors = {
            hair: '.hair-style-btn',
            hairColor: '.hair-color-btn',
            skinTone: '.skin-tone-btn',
            age: '.age-btn',
            gender: '.gender-btn',
            clothing: '.clothing-btn'
        };
        const dataKeys = {
            hair: 'style',
            hairColor: 'color',
            skinTone: 'tone',
            age: 'age',
            gender: 'gender',
            clothing: 'clothing'
        };

        for (const key in selectors) {
            const selectedBtn = uiElement.querySelector(`${selectors[key]}[style*="4caf50"], ${selectors[key]}[style*="rgb(51, 51, 51)"]`);
            if (selectedBtn) {
                config[key] = selectedBtn.dataset[dataKeys[key]];
            }
        }
        return config;
    }

    /**
     * Hide the customization menu
     */
    hideCustomizationMenu() {
        if (!this.isUIOpen) return;

        this.isUIOpen = false;
        this.currentContactId = null;
        
        // Remove UI elements safely
        if (this.customizationUI && this.customizationUI.parentNode) {
            this.customizationUI.parentNode.removeChild(this.customizationUI);
            this.customizationUI = null;
        }
        
        // Remove overlay safely
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
        
        // Restore scene interaction
        this.unblockSceneInteraction();
    }

    /**
     * Check if the customization menu is currently open
     */
    isMenuOpen() {
        return this.customizationUI !== null && this.overlay !== null;
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
            align-items: flex-start;
            padding-top: 20px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hideCustomizationMenu();
            }
        });
        
        // Prevent touch events from reaching the 3D scene
        this.overlay.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        this.overlay.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        this.overlay.addEventListener('touchend', (e) => {
            e.stopPropagation();
        }, { passive: true });

        document.body.appendChild(this.overlay);
    }

    /**
     * Create the main customization UI
     */
    createCustomizationUI(contactData) {
        this.customizationUI = document.createElement('div');
        this.customizationUI.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            position: relative;
            z-index: 1001;
        `;

        // Add touch event handlers to prevent 3D scene interference
        this.customizationUI.addEventListener('touchstart', (e) => {
            e.stopPropagation(); // Prevent InputManager from handling this
        }, { passive: true });
        
        this.customizationUI.addEventListener('touchmove', (e) => {
            e.stopPropagation(); // Prevent InputManager from handling this
        }, { passive: true });
        
        this.customizationUI.addEventListener('touchend', (e) => {
            e.stopPropagation(); // Prevent InputManager from handling this
        }, { passive: true });

        // Get current customization or use defaults
        const currentConfig = this.getContactCustomization(this.currentContactId);
        
        // Handle case where contactData might be null or undefined
        const contactName = contactData?.name || 'Contact';
        
        const { html, previewHTML } = this.getCustomizationHTML(currentConfig, contactData);
        
        this.customizationUI.innerHTML = html;
        this.overlay.appendChild(this.customizationUI);

        const previewContainer = this.customizationUI.querySelector(`#avatar-preview-${this.currentContactId}`);
        if (previewContainer) {
            previewContainer.innerHTML = previewHTML;
        }
        
        // Add event listeners
        this.setupAvatarEventListeners(this.customizationUI, currentConfig, this.currentContactId);
        
        // Create initial preview
        this.updateAvatarPreview(currentConfig, this.currentContactId);
    }

    /**
     * Create hair customization section
     */
    createHairSection(currentConfig) {
        const hairStyles = window.AvatarStyles.HAIR_STYLES;
        const hairColors = window.AvatarStyles.HAIR_COLORS;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Hair</h3>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Style:</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${Object.entries(hairStyles).map(([key, style]) => `
                            <button class="hair-style-btn" data-style="${key}" 
                                style="padding: 8px 12px; border: 2px solid ${currentConfig.hair === key ? '#4caf50' : '#ddd'}; 
                                background: ${currentConfig.hair === key ? '#e8f5e8' : 'white'}; border-radius: 4px; cursor: pointer; font-size: 14px;">
                                ${style.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Color:</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${Object.entries(hairColors).map(([key, color]) => `
                            <button class="hair-color-btn" data-color="${key}"
                                style="width: 40px; height: 40px; border: 3px solid ${currentConfig.hairColor === key ? '#333' : '#ddd'}; 
                                background-color: #${color.color.toString(16).padStart(6, '0')}; border-radius: 50%; cursor: pointer;">
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create skin tone section
     */
    createSkinToneSection(currentConfig) {
        const skinTones = window.AvatarStyles.SKIN_TONES;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Skin Tone</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${Object.entries(skinTones).map(([key, tone]) => `
                        <button class="skin-tone-btn" data-tone="${key}"
                            style="width: 50px; height: 50px; border: 3px solid ${currentConfig.skinTone === key ? '#333' : '#ddd'}; 
                            background-color: #${tone.color.toString(16).padStart(6, '0')}; border-radius: 8px; cursor: pointer;
                            display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                            ${tone.name.charAt(0)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Create age section
     */
    createAgeSection(currentConfig) {
        const ageCategories = window.AvatarStyles.AGE_CATEGORIES;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Age</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${Object.entries(ageCategories).map(([key, age]) => `
                        <button class="age-btn" data-age="${key}"
                            style="padding: 8px 12px; border: 2px solid ${currentConfig.age === key ? '#4caf50' : '#ddd'}; 
                            background: ${currentConfig.age === key ? '#e8f5e8' : 'white'}; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            ${age.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Create gender section
     */
    createGenderSection(currentConfig) {
        const genderStyles = window.AvatarStyles.GENDER_STYLES;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Gender</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${Object.entries(genderStyles).map(([key, gender]) => `
                        <button class="gender-btn" data-gender="${key}"
                            style="padding: 8px 12px; border: 2px solid ${currentConfig.gender === key ? '#4caf50' : '#ddd'}; 
                            background: ${currentConfig.gender === key ? '#e8f5e8' : 'white'}; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            ${gender.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Create clothing section
     */
    createClothingSection(currentConfig) {
        const clothingThemes = window.AvatarStyles.CLOTHING_THEMES;
        
        return `
            <div class="customization-section" style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Clothing Theme</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${Object.entries(clothingThemes).map(([key, clothing]) => `
                        <button class="clothing-btn" data-clothing="${key}"
                            style="padding: 8px 12px; border: 2px solid ${currentConfig.clothing === key ? '#4caf50' : '#ddd'}; 
                            background: ${currentConfig.clothing === key ? '#e8f5e8' : 'white'}; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            ${clothing.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for the customization UI
     */
    setupEventListeners(currentConfig) {
        let config = { ...currentConfig };

        // Hair style buttons
        this.customizationUI.querySelectorAll('.hair-style-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update selection
                this.customizationUI.querySelectorAll('.hair-style-btn').forEach(b => {
                    b.style.border = '2px solid #ddd';
                    b.style.background = 'white';
                });
                btn.style.border = '2px solid #4caf50';
                btn.style.background = '#e8f5e8';
                
                config.hair = btn.dataset.style;
                this.updateAvatarPreview(config);
            });
        });

        // Hair color buttons
        this.customizationUI.querySelectorAll('.hair-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.customizationUI.querySelectorAll('.hair-color-btn').forEach(b => {
                    b.style.border = '3px solid #ddd';
                });
                btn.style.border = '3px solid #333';
                
                config.hairColor = btn.dataset.color;
                this.updateAvatarPreview(config);
            });
        });

        // Skin tone buttons
        this.customizationUI.querySelectorAll('.skin-tone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.customizationUI.querySelectorAll('.skin-tone-btn').forEach(b => {
                    b.style.border = '3px solid #ddd';
                });
                btn.style.border = '3px solid #333';
                
                config.skinTone = btn.dataset.tone;
                this.updateAvatarPreview(config);
            });
        });

        // Age buttons
        this.customizationUI.querySelectorAll('.age-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.customizationUI.querySelectorAll('.age-btn').forEach(b => {
                    b.style.border = '2px solid #ddd';
                    b.style.background = 'white';
                });
                btn.style.border = '2px solid #4caf50';
                btn.style.background = '#e8f5e8';
                
                config.age = btn.dataset.age;
                this.updateAvatarPreview(config);
            });
        });

        // Gender buttons
        this.customizationUI.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.customizationUI.querySelectorAll('.gender-btn').forEach(b => {
                    b.style.border = '2px solid #ddd';
                    b.style.background = 'white';
                });
                btn.style.border = '2px solid #4caf50';
                btn.style.background = '#e8f5e8';
                
                config.gender = btn.dataset.gender;
                this.updateAvatarPreview(config);
            });
        });

        // Clothing buttons
        this.customizationUI.querySelectorAll('.clothing-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.customizationUI.querySelectorAll('.clothing-btn').forEach(b => {
                    b.style.border = '2px solid #ddd';
                    b.style.background = 'white';
                });
                btn.style.border = '2px solid #4caf50';
                btn.style.background = '#e8f5e8';
                
                config.clothing = btn.dataset.clothing;
                this.updateAvatarPreview(config);
            });
        });

        // Action buttons
        document.getElementById('resetButton').addEventListener('click', () => {
            config = { ...window.AvatarStyles.DEFAULT_AVATAR };
            this.updateAvatarPreview(config);
            // Reset UI selections
            this.updateUISelections(config);
        });

        document.getElementById('cancelButton').addEventListener('click', () => {
            this.hideCustomizationMenu();
        });

        document.getElementById('doneButton').addEventListener('click', () => {
            console.log('👤 [UI DEBUG] ===============================================');
            console.log('👤 [UI DEBUG] DONE BUTTON CLICKED - STARTING SAVE PROCESS');
            console.log('👤 [UI DEBUG] ===============================================');
            console.log('👤 [UI DEBUG] Current contact ID:', this.currentContactId);
            
            // CRITICAL FIX: Use window.currentAvatarConfig which contains all SVG UI updates
            // instead of the local config object which only has ContactCustomizationManager updates
            const finalConfig = window.currentAvatarConfig || config;
            console.log('👤 [UI DEBUG] Local config:', JSON.stringify(config));
            console.log('👤 [UI DEBUG] SVG UI config (window.currentAvatarConfig):', JSON.stringify(window.currentAvatarConfig));
            console.log('👤 [UI DEBUG] Final config to save:', JSON.stringify(finalConfig));
            console.log('👤 [UI DEBUG] customizationData size BEFORE save:', this.customizationData.size);
            console.log('👤 [UI DEBUG] Calling saveContactCustomization...');
            
            this.saveContactCustomization(this.currentContactId, finalConfig);
            
            console.log('👤 [UI DEBUG] customizationData size AFTER save:', this.customizationData.size);
            console.log('👤 [UI DEBUG] Updating avatar visual...');
            
            this.updateContactAvatar(this.currentContactId);
            
            console.log('👤 [UI DEBUG] Hiding menu...');
            this.hideCustomizationMenu();
            console.log('👤 [UI DEBUG] ===============================================');
            console.log('👤 [UI DEBUG] SAVE PROCESS COMPLETE');
            console.log('👤 [UI DEBUG] ===============================================');
        });
    }

    /**
     * Update UI selections to match config
     */
    updateUISelections(uiElement, config) {
        const updateButtons = (selector, configKey, dataKey) => {
            uiElement.querySelectorAll(selector).forEach(btn => {
                const isSelected = btn.dataset[dataKey] === config[configKey];
                const isColorButton = btn.classList.contains('hair-color-btn') || btn.classList.contains('skin-tone-btn');
                
                btn.style.border = isSelected 
                    ? (isColorButton ? '3px solid #333' : '2px solid #4caf50')
                    : (isColorButton ? '3px solid #ddd' : '2px solid #ddd');

                if (!isColorButton) {
                    btn.style.background = isSelected ? '#e8f5e8' : 'white';
                }
            });
        };

        updateButtons('.hair-style-btn', 'hair', 'style');
        updateButtons('.hair-color-btn', 'hairColor', 'color');
        updateButtons('.skin-tone-btn', 'skinTone', 'tone');
        updateButtons('.age-btn', 'age', 'age');
        updateButtons('.gender-btn', 'gender', 'gender');
        updateButtons('.clothing-btn', 'clothing', 'clothing');
    }

    /**
     * Update the avatar preview
     */
    updateAvatarPreview(config, contactId) {
        const finalContactId = contactId || this.currentContactId;
        const previewDiv = document.getElementById(`avatar-preview-${finalContactId}`);
        if (previewDiv) {
            const hairStyle = window.AvatarStyles.HAIR_STYLES[config.hair];
            const hairColor = window.AvatarStyles.HAIR_COLORS[config.hairColor];
            const skinTone = window.AvatarStyles.SKIN_TONES[config.skinTone];
            const age = window.AvatarStyles.AGE_CATEGORIES[config.age];
            const gender = window.AvatarStyles.GENDER_STYLES[config.gender];
            const clothing = window.AvatarStyles.CLOTHING_THEMES[config.clothing];
            
            previewDiv.innerHTML = `
                <div style="text-align: left; padding: 20px; background: white; border-radius: 8px; font-size: 14px;">
                    <strong>Preview:</strong><br>
                    ${age.name} ${gender.name}<br>
                    ${skinTone.name} skin tone<br>
                    ${hairStyle.name ? hairColor.name + ' ' + hairStyle.name.toLowerCase() : 'Bald'}<br>
                    ${clothing.name} outfit
                </div>
            `;
        }
        // Dispatch event for 3D preview if a system is listening
        const event = new CustomEvent('avatarConfigUpdated', { detail: { config: config, contactId: finalContactId } });
        window.dispatchEvent(event);
    }

    /**
     * Block 3D scene interaction while UI is open
     */
    blockSceneInteraction() {
        // SIMPLE APPROACH: Only disable camera controls, allow all UI interactions to flow normally
        console.log('👤 Disabling camera controls for customization UI (simple approach)');
        
        // Disable camera controls to prevent 3D scene interaction
        if (window.app && window.app.cameraControls) {
            this.originalCameraEnabled = window.app.cameraControls.enabled;
            window.app.cameraControls.enabled = false;
            console.log('👤 Camera controls disabled');
        }
        
        // Disable canvas event listeners temporarily (simpler than document-level blocking)
        if (window.app && window.app.renderer && window.app.renderer.domElement) {
            const canvas = window.app.renderer.domElement;
            this.originalCanvasStyle = canvas.style.pointerEvents;
            canvas.style.pointerEvents = 'none';
            console.log('👤 Canvas pointer events disabled');
        }
        
        // No complex event blocking - let all UI events flow naturally
    }

    /**
     * Restore 3D scene interaction
     */
    unblockSceneInteraction() {
        console.log('👤 Restoring 3D scene interaction after customization UI');
        
        // Restore camera controls
        if (window.app && window.app.cameraControls && this.originalCameraEnabled !== undefined) {
            window.app.cameraControls.enabled = this.originalCameraEnabled;
            console.log('👤 Camera controls restored');
            this.originalCameraEnabled = undefined;
        }
        
        // Restore canvas pointer events
        if (window.app && window.app.renderer && window.app.renderer.domElement && this.originalCanvasStyle !== undefined) {
            window.app.renderer.domElement.style.pointerEvents = this.originalCanvasStyle;
            console.log('👤 Canvas pointer events restored');
            this.originalCanvasStyle = undefined;
        }
    }

    /**
     * Get customization for a contact (or default)
     */
    getContactCustomization(contactId) {
        const savedConfig = this.customizationData.get(contactId);
        const defaultConfig = { ...window.AvatarStyles.DEFAULT_AVATAR };
        return { ...defaultConfig, ...savedConfig };
    }

    /**
     * Save customization for a contact
     */
    saveContactCustomization(contactId, config) {
        // Validate config object before saving
        if (!config || typeof config !== 'object') {
            config = { ...window.AvatarStyles.DEFAULT_AVATAR };
        }
        
        // Ensure all required properties exist by merging with defaults
        const defaultAvatar = window.AvatarStyles.DEFAULT_AVATAR;
        const validatedConfig = { ...defaultAvatar, ...config };
        
        this.customizationData.set(contactId, validatedConfig);
        
        // SAFETY: Track when avatar customizations occur to prevent restoration conflicts
        window.lastAvatarCustomizationTime = Date.now();
        
        // INTEGRATE WITH EXISTING PERSISTENCE SYSTEM: Store in window.contactAvatarStates
        if (!window.contactAvatarStates) window.contactAvatarStates = new Map();
        window.contactAvatarStates.set(contactId, { 
            hadAvatar: true, 
            config: validatedConfig 
        });
        
        // For user-initiated saves, temporarily allow saving even during loading
        const wasLoading = this.isLoading;
        if (wasLoading) {
            this.isLoading = false;
        }
        
        this.saveCustomizations();
        
        // Special handling for explore avatar - regenerate the avatar in explore mode
        if (contactId === 'EXPLORE_AVATAR') {
            console.log('🎨 [EXPLORE AVATAR] Customization saved, regenerating explore avatar...');
            
            // Trigger explore avatar regeneration after a short delay to ensure save is complete
            setTimeout(() => {
                if (window.app && window.app.exploreManager && window.app.exploreManager.exploreMode) {
                    const exploreMode = window.app.exploreManager.exploreMode;
                    if (exploreMode.isActive && exploreMode.createAvatar) {
                        console.log('🎨 [EXPLORE AVATAR] Regenerating explore avatar with new customization');
                        exploreMode.createAvatar(); // This will recreate the avatar with the new config
                        
                        // IMPORTANT: Position avatar properly and set up camera
                        exploreMode.positionAvatarInHomeArea();
                        exploreMode.setupThirdPersonCamera();
                        console.log('🎨 [EXPLORE AVATAR] Avatar repositioned and camera updated');
                    }
                } else if (window.exploreManager && window.exploreManager.exploreMode) {
                    const exploreMode = window.exploreManager.exploreMode;
                    if (exploreMode.isActive && exploreMode.createAvatar) {
                        console.log('🎨 [EXPLORE AVATAR] Regenerating explore avatar with new customization (fallback)');
                        exploreMode.createAvatar();
                        
                        // IMPORTANT: Position avatar properly and set up camera
                        exploreMode.positionAvatarInHomeArea();
                        exploreMode.setupThirdPersonCamera();
                        console.log('🎨 [EXPLORE AVATAR] Avatar repositioned and camera updated (fallback)');
                    }
                } else {
                    console.log('🎨 [EXPLORE AVATAR] Explore mode not available for avatar regeneration');
                }
            }, 100);
        }
        
        // Restore loading flag if it was set (but only if we're still in a loading operation)
        if (wasLoading) {
            setTimeout(() => {
                if (wasLoading) {
                    // Not restoring loading flag - allowing normal completion
                }
            }, 100);
        }
    }

    /**
     * Update the 3D avatar for a contact
     * DISABLED: Old 3D avatar system conflicts with new SVG system
     */
    updateContactAvatar(contactId) {
        console.log('🚫 ContactCustomizationManager.updateContactAvatar() DISABLED - using SVG avatar system instead');
        return; // Disabled to prevent conflicts with SVG avatar system
        
        const config = this.getContactCustomization(contactId);
        const event = new CustomEvent('avatarConfigUpdated', { detail: { config: config, contactId: contactId } });
        window.dispatchEvent(event);
        return;
        
        const avatar = this.avatarGenerator.generateAvatar(config);
        
        // Add proper userData to avatar root for raycaster and positioning system
        avatar.userData = {
            ...avatar.userData,
            type: 'avatar',
            isAvatar: true,
            parentContactId: contactId,
            name: `avatar_${contactId}`
        };
        
        // Add proper userData to all avatar components to prevent raycaster warnings
        avatar.traverse((child) => {
            if (child.isMesh && !child.userData.type) {
                child.userData = {
                    ...child.userData,
                    type: 'avatarComponent',
                    isAvatarPart: true,
                    parentContactId: contactId
                };
            }
        });
        
        avatar.scale.multiplyScalar(0.8); // Scale down for contact objects
        
        // Remove existing avatar if any
        this.removeContactAvatar(contactId);
        
        // Find the contact object and add avatar
        const contactObject = this.findContactObject(contactId);
        if (contactObject) {
            // Position avatar relative to contact object (since avatar will be a child)
            // Contact objects have height 2.5, so their center is at Y=0 (relative)
            // Top surface is at Y = 1.25 (half height above center)
            // Avatar's legs are cylinders with height 0.6 positioned at Y = -0.3
            // So the bottom of the legs is at Y = -0.6, need to offset by +0.6 to place feet on surface
            avatar.position.set(
                0, // X relative to contact object center
                1.25 + 0.6, // Y: contact half-height + avatar leg offset  
                0  // Z relative to contact object center
            );
            
            contactObject.add(avatar);
            this.activeAvatars.set(contactId, avatar);
        }
    }

    /**
     * Remove avatar for a contact
     */
    removeContactAvatar(contactId) {
        const existingAvatar = this.activeAvatars.get(contactId);
        if (existingAvatar && existingAvatar.parent) {
            existingAvatar.parent.remove(existingAvatar);
            this.activeAvatars.delete(contactId);
        }
    }

    /**
     * Find contact object in the scene by ID
     */
    findContactObject(contactId) {
        // Search through the scene for contact objects
        let foundObject = null;
        
        // Get the main app scene
        const scene = this.app.scene || window.app?.scene;
        if (!scene) {
            return null;
        }
        
        scene.traverse((object) => {
            // Check if this is a contact object with matching ID
            if (object.userData && object.userData.isContact) {
                const objContactId = object.userData.contactId || object.userData.fileId;
                if (objContactId && objContactId.toString() === contactId.toString()) {
                    foundObject = object;
                }
            }
        });
        
        return foundObject;
    }

    /**
     * Load customizations from storage with fallback mechanisms
     */
    async loadCustomizations() {
        try {
            this.isLoading = true; // Prevent saves during loading
            
            // DEBUG: Check current window.contactAvatarStates status first
            if (window.contactAvatarStates) {
                window.contactAvatarStates.forEach((state, contactId) => {
                    // Silently check states without logging
                });
            }
            
            // Try primary localStorage first
            let saved = localStorage.getItem('contactAvatarCustomizations');
            
            // INTEGRATE WITH EXISTING PERSISTENCE SYSTEM: Check window.contactAvatarStates first
            if ((!saved || saved === 'null') && window.contactAvatarStates && window.contactAvatarStates.size > 0) {
                const sessionData = {};
                window.contactAvatarStates.forEach((state, contactId) => {
                    if (state.hadAvatar && state.config) {
                        sessionData[contactId] = state.config;
                    }
                });
                
                if (Object.keys(sessionData).length > 0) {
                    saved = JSON.stringify(sessionData);
                    localStorage.setItem('contactAvatarCustomizations', saved);
                }
            }
            
            // If primary storage is empty, try all backup sources aggressively
            if (!saved || saved === 'null') {
                // Try alternative localStorage keys
                const altKeys = ['contactAvatarCustomizations_primary', 'contactAvatarCustomizations_session'];
                for (const key of altKeys) {
                    const altData = localStorage.getItem(key);
                    if (altData && altData !== 'null') {
                        saved = altData;
                        // Restore to primary key
                        localStorage.setItem('contactAvatarCustomizations', saved);
                        break;
                    }
                }
                
                // Try timestamped backups
                if (!saved || saved === 'null') {
                    const keys = Object.keys(localStorage);
                    const timestampedKeys = keys.filter(k => k.startsWith('contactAvatarCustomizations_') && /\d+$/.test(k));
                    if (timestampedKeys.length > 0) {
                        // Get the most recent timestamped backup
                        const latestKey = timestampedKeys.sort().pop();
                        const timestampedData = localStorage.getItem(latestKey);
                        if (timestampedData && timestampedData !== 'null') {
                            saved = timestampedData;
                            localStorage.setItem('contactAvatarCustomizations', saved);
                        }
                    }
                }
                
                // Try sessionStorage backups
                if (!saved || saved === 'null') {
                    const sessionKeys = ['contactAvatarCustomizations_backup', 'contactAvatarCustomizations_session'];
                    for (const key of sessionKeys) {
                        const sessionBackup = sessionStorage.getItem(key);
                        if (sessionBackup && sessionBackup !== 'null') {
                            saved = sessionBackup;
                            // Restore to localStorage
                            localStorage.setItem('contactAvatarCustomizations', saved);
                            break;
                        }
                    }
                }
                
                // Try window object backup
                if (!saved || saved === 'null') {
                    if (window.avatarCustomizationBackup) {
                        if (window.avatarCustomizationBackup.jsonData) {
                            saved = window.avatarCustomizationBackup.jsonData;
                        } else if (window.avatarCustomizationBackup.data) {
                            saved = JSON.stringify(window.avatarCustomizationBackup.data);
                        }
                        
                        if (saved && saved !== 'null') {
                            // Restore to localStorage
                            localStorage.setItem('contactAvatarCustomizations', saved);
                        }
                    }
                }
                
                // Try Flutter bridge storage with multiple handlers (Enhanced error handling - Fix #4)
                if ((!saved || saved === 'null') && window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    try {
                        // Try primary handler with comprehensive error handling
                        const flutterData = await window.flutter_inappwebview.callHandler('loadAvatarCustomizations')
                            .catch(error => {
                                console.error('👤 [BRIDGE ERROR] loadAvatarCustomizations failed:', error);
                                return null;
                            });
                            

                        if (flutterData && flutterData !== 'null') {
                            saved = flutterData;
                            localStorage.setItem('contactAvatarCustomizations', saved);
                            
                            // CRITICAL: Populate window.contactAvatarStates from Flutter data
                            try {
                                const flutterParsedData = JSON.parse(flutterData);
                                if (!window.contactAvatarStates) window.contactAvatarStates = new Map();
                                Object.entries(flutterParsedData).forEach(([contactId, config]) => {
                                    window.contactAvatarStates.set(contactId, { 
                                        hadAvatar: true, 
                                        config: config 
                                    });
                                });
                            } catch (parseError) {
                                console.error('👤 [LOAD DEBUG] ❌ Failed to populate window.contactAvatarStates:', parseError);
                            }
                        } else {
                            // Try SharedPreferences as fallback
                            const sharedPrefsData = await this.loadFromFlutterSharedPrefs()
                                .catch(error => {
                                    console.error('👤 [BRIDGE ERROR] SharedPrefs fallback failed:', error);
                                    return null;
                                });
                                
                            if (sharedPrefsData && sharedPrefsData !== 'null') {
                                saved = sharedPrefsData;
                                localStorage.setItem('contactAvatarCustomizations', saved);
                                
                                // CRITICAL: Populate window.contactAvatarStates from SharedPrefs data
                                try {
                                    const sharedPrefsParsedData = JSON.parse(sharedPrefsData);
                                    if (!window.contactAvatarStates) window.contactAvatarStates = new Map();
                                    Object.entries(sharedPrefsParsedData).forEach(([contactId, config]) => {
                                        window.contactAvatarStates.set(contactId, { 
                                            hadAvatar: true, 
                                            config: config 
                                        });
                                    });
                                } catch (parseError) {
                                    console.error('👤 [LOAD DEBUG] ❌ Failed to populate window.contactAvatarStates from SharedPrefs:', parseError);
                                }
                            }
                        }
                    } catch (bridgeError) {
                        console.error('👤 [BRIDGE ERROR] Complete Flutter bridge failure:', bridgeError);
                    }
                }
            }
            
            if (saved && saved !== 'null') {
                const data = JSON.parse(saved);
                this.customizationData = new Map(Object.entries(data));
            }
        } catch (error) {
            console.error('👤 Error loading customizations:', error);
        } finally {
            this.isLoading = false; // Clear loading flag to allow saves
        }
    }

    /**
     * Set up monitoring to detect when localStorage gets cleared
     * and automatically restore from backups
     */
    setupPersistenceMonitoring() {
        // Avoid setting up multiple monitors
        if (this.persistenceMonitorActive) {
            return;
        }
        this.persistenceMonitorActive = true;
        
        // Monitor localStorage every 2 seconds - DISABLED to reduce log spam
        /*
        this.persistenceInterval = setInterval(() => {
            // Don't interfere while loading
            if (this.isLoading) {
                return;
            }
            
            const current = localStorage.getItem('contactAvatarCustomizations');
            
            // If localStorage was cleared but we have backup data
            if ((!current || current === 'null') && this.customizationData.size > 0) {
                console.warn('👤 [PERSISTENCE] ⚠️ localStorage was cleared! Attempting recovery...');
                this.saveCustomizations(); // This will restore from backups
            }
        }, 2000);
        
        // Monitor for visibility changes (app going to background/foreground)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                setTimeout(() => {
                    // Don't interfere while loading
                    if (this.isLoading) {
                        return;
                    }
                    
                    const current = localStorage.getItem('contactAvatarCustomizations');
                    if ((!current || current === 'null') && this.customizationData.size > 0) {
                        console.warn('👤 [PERSISTENCE] Storage lost during background, recovering...');
                        this.saveCustomizations();
                    }
                }, 500);
            }
        });
        
        // Monitor for beforeunload to ensure final save
        window.addEventListener('beforeunload', () => {
            if (this.customizationData.size > 0) {
                this.saveCustomizations();
            }
        });
        
        console.log('👤 [PERSISTENCE] Storage monitoring active');
        */
        console.log('👤 [PERSISTENCE] Storage monitoring disabled to reduce log spam');
    }

    /**
     * Try alternative Flutter storage methods for app-level persistence
     */
    tryAlternativeFlutterStorage(jsonData) {
        if (!window.flutter_inappwebview || !window.flutter_inappwebview.callHandler) {
            return;
        }
        
        // OPTIMIZED: Only try writeFileToStorage as the most reliable fallback
        window.flutter_inappwebview.callHandler('writeFileToStorage', {
            filename: 'avatar_customizations.json',
            data: jsonData
        }).catch(() => {}); // Silent fail
    }

    /**
     * Save to Flutter SharedPreferences for app-level persistence
     * OPTIMIZED: Only use one primary handler to avoid log spam
     */
    saveToFlutterSharedPrefs(jsonData) {
        if (!window.flutter_inappwebview || !window.flutter_inappwebview.callHandler) {
            return;
        }
        
        // Use only the primary handler - bridge will handle the mapping
        window.flutter_inappwebview.callHandler('setStringPreference', 'contactAvatarCustomizations', jsonData)
        .then(() => {
            // Success - no need for fallbacks
        })
        .catch(error => {
            // Only try fallback if primary fails
            window.flutter_inappwebview.callHandler('SharedPreferencesChannel', 'contactAvatarCustomizations', jsonData)
            .catch(() => {}); // Silent fail for fallback
        });
    }

    /**
     * Enhanced load with Flutter SharedPreferences fallback
     */
    loadFromFlutterSharedPrefs() {
        if (!window.flutter_inappwebview || !window.flutter_inappwebview.callHandler) {
            return Promise.resolve(null);
        }
        
        // Try various SharedPreferences read methods
        const prefReaders = [
            'getStringPreference',
            'loadStringFromPrefs', 
            'getUserPreference',
            'SharedPreferencesChannel'
        ];
        
        return Promise.all(prefReaders.map(handler => 
            window.flutter_inappwebview.callHandler(handler, 'contactAvatarCustomizations')
                .then(data => {
                    if (data && data !== 'null') {
                        return data;
                    }
                    return null;
                })
                .catch(() => null)
        )).then(results => results.find(result => result !== null) || null);
    }

    /**
     * Apply saved avatars to all contacts that have customizations
     * This should be called after contacts are loaded
     * DISABLED: Old 3D avatar system conflicts with new SVG system
     */
    applyAllSavedAvatars() {
        console.log(' Applying all saved avatars...');
        // ROOT CAUSE FIX: Reload from localStorage to get the latest changes
        this.loadCustomizations();
        
        if (this.customizationData.size === 0) {
            console.log('👤 No saved customizations to apply.');
            return;
        }
        
        for (const [contactId, config] of this.customizationData.entries()) {
            // Use the SVG Avatar Replacer to update the avatar
            if (window.SVGAvatarReplacer && window.SVGAvatarReplacer.instance) {
                window.SVGAvatarReplacer.instance.updateContactAvatar(contactId, config);
            } else {
                // Fallback to old method if new one isn't available
                this.updateContactAvatar(contactId);
            }
        }
        console.log(`👤 Finished applying ${this.customizationData.size} saved avatars.`);
    }

    /**
     * Static method to apply saved avatars (for external calls)
     * DISABLED: Old 3D avatar system conflicts with new SVG system
     */
    static applyAllSavedAvatars() {
        if (ContactCustomizationManager.instance) {
            ContactCustomizationManager.instance.applyAllSavedAvatars();
        } else {
            console.error('Cannot apply saved avatars, ContactCustomizationManager not initialized.');
        }
    }

    /**
     * Save customizations to localStorage with enhanced persistence
     */
    saveCustomizations() {
        try {
            // Prevent saves during loading to avoid race conditions
            if (this.isLoading) {
                return;
            }
            
            // Check if data actually changed to prevent unnecessary saves
            const currentDataStr = JSON.stringify(Object.fromEntries(this.customizationData));
            if (this.lastSavedDataString === currentDataStr) {
                return; // No changes, skip save
            }
            
            // ENHANCED DEBOUNCE: Longer delay and smarter reset logic
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            
            this.saveTimeout = setTimeout(() => {
                this.performActualSave();
            }, 1000); // Increased to 1 second debounce to reduce spam
        } catch (error) {
            console.error('👤 Error in saveCustomizations:', error);
        }
    }
    
    performActualSave() {
        try {
            
            // Enhanced debugging for empty data
            if (this.customizationData.size === 0) {
                // Check if we have any backup data
                if (window.avatarCustomizationBackup?.data) {
                    // Restore from backup
                    Object.entries(window.avatarCustomizationBackup.data).forEach(([key, value]) => {
                        this.customizationData.set(key, value);
                    });
                } else {
                    // If no backup data and customizationData is empty, check if we're accidentally 
                    // overwriting good data during initial load
                    const existingData = localStorage.getItem('contactAvatarCustomizations');
                    if (existingData && existingData !== 'null' && existingData !== '{}') {
                        console.warn('👤 [SAVE DEBUG] ⚠️ PREVENTING ACCIDENTAL OVERWRITE! localStorage has good data but customizationData is empty.');
                        return; // Don't overwrite good data with empty data
                    }
                }
            }
            
            const data = Object.fromEntries(this.customizationData);
            
            // Primary storage with enhanced persistence
            const jsonData = JSON.stringify(data);
            
            // Store the last saved data to prevent redundant saves
            this.lastSavedDataString = jsonData;
            
            // Validate JSON before saving
            if (jsonData === '{}') {
                // Don't save empty data, but also don't fail
                return;
            }
            
            // Save to multiple localStorage keys for redundancy
            localStorage.setItem('contactAvatarCustomizations', jsonData);
            localStorage.setItem('contactAvatarCustomizations_primary', jsonData);
            localStorage.setItem('contactAvatarCustomizations_' + Date.now(), jsonData); // Timestamped backup
            
            // Immediate verification
            const verification = localStorage.getItem('contactAvatarCustomizations');
            if (verification !== jsonData) {
                console.error('👤 [SAVE DEBUG] ❌ Immediate verification failed!');
            }
            
            // Enhanced backup storage mechanisms
            try {
                // Store in sessionStorage as backup with multiple keys
                sessionStorage.setItem('contactAvatarCustomizations_backup', jsonData);
                sessionStorage.setItem('contactAvatarCustomizations_session', jsonData);
                
                // Store in window object as emergency fallback with enhanced data
                if (!window.avatarCustomizationBackup) {
                    window.avatarCustomizationBackup = {};
                }
                window.avatarCustomizationBackup.data = data;
                window.avatarCustomizationBackup.jsonData = jsonData;
                window.avatarCustomizationBackup.timestamp = Date.now();
                window.avatarCustomizationBackup.saveCount = (window.avatarCustomizationBackup.saveCount || 0) + 1;
                
                // Enhanced Flutter bridge with persistence check and multiple handlers
                if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
                    // Try primary handler
                    window.flutter_inappwebview.callHandler('saveAvatarCustomizations', jsonData)
                        .then(() => {
                            // Verify save worked by attempting load
                            return window.flutter_inappwebview.callHandler('loadAvatarCustomizations');
                        })
                        .then(loadedData => {
                            if (loadedData !== jsonData) {
                                console.warn('👤 [SAVE DEBUG] ⚠️ Flutter storage verification failed');
                            }
                        })
                        .catch(e => {
                            // Try alternative storage methods for app-level persistence
                            this.tryAlternativeFlutterStorage(jsonData);
                        });
                        
                    // Also try storing via shared preferences for app-level persistence
                    this.saveToFlutterSharedPrefs(jsonData);
                }
                
                // Set up periodic persistence check
                this.setupPersistenceMonitoring();
                
            } catch (backupError) {
                console.warn('👤 [SAVE DEBUG] Backup storage failed:', backupError);
            }
            
        } catch (error) {
            console.error('👤 Error saving customizations:', error);
        }
    }

    /**
     * Initialize additional persistence mechanisms for app restarts
     */
    initializeAppRestartPersistence() {
        // Try to load from all possible sources on initialization
        setTimeout(() => {
            this.loadFromAllSources();
        }, 1000);
        
        // Set up periodic saves to multiple sources - DISABLED to reduce log spam
        /*
        setInterval(() => {
            if (this.customizationData.size > 0) {
                this.saveToAllSources();
            }
        }, 5000); // Save every 5 seconds
        */
        console.log('👤 [PERSISTENCE] Periodic saves disabled to reduce log spam');
    }

    /**
     * Try to load from all possible storage sources
     */
    async loadFromAllSources() {
        // Check if we already have data
        if (this.customizationData.size > 0) {
            return;
        }
        
        // Try Flutter file storage
        try {
            const fileData = await this.loadFromFlutterFileStorage();
            if (fileData) {
                const data = JSON.parse(fileData);
                this.customizationData = new Map(Object.entries(data));
                this.applyAllSavedAvatars();
                return;
            }
        } catch (e) {
            // Silent fail
        }
        
        // Try Flutter SharedPreferences
        try {
            const prefsData = await this.loadFromFlutterSharedPrefs();
            if (prefsData) {
                const data = JSON.parse(prefsData);
                this.customizationData = new Map(Object.entries(data));
                this.applyAllSavedAvatars();
                return;
            }
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Save to all possible storage sources
     */
    saveToAllSources() {
        if (this.customizationData.size === 0) return;
        
        const jsonData = JSON.stringify(Object.fromEntries(this.customizationData));
        
        // Save to Flutter file storage
        this.saveToFlutterFileStorage(jsonData);
        
        // Save to Flutter SharedPreferences  
        this.saveToFlutterSharedPrefs(jsonData);
        
        // Save to regular storage as backup
        this.saveCustomizations();
    }

    /**
     * Load from Flutter file storage for app restart persistence
     */
    loadFromFlutterFileStorage() {
        if (!window.flutter_inappwebview || !window.flutter_inappwebview.callHandler) {
            return Promise.resolve(null);
        }
        
        return window.flutter_inappwebview.callHandler('readFileFromStorage', 'avatar_customizations.json')
            .then(data => {
                if (data && data !== 'null' && data !== '') {
                    return data;
                }
                return null;
            })
            .catch(() => null);
    }

    /**
     * Save to Flutter file storage for app restart persistence
     */
    saveToFlutterFileStorage(jsonData) {
        if (!window.flutter_inappwebview || !window.flutter_inappwebview.callHandler) {
            return;
        }
        
        window.flutter_inappwebview.callHandler('writeFileToStorage', {
            filename: 'avatar_customizations.json',
            content: jsonData
        })
        .then(() => {})
        .catch(e => {});
    }

    /**
     * Clean up persistence monitoring resources
     */
    cleanup() {
        if (this.persistenceInterval) {
            clearInterval(this.persistenceInterval);
            this.persistenceInterval = null;
        }
        this.persistenceMonitorActive = false;
    }
}

// Export the manager
window.ContactCustomizationManager = ContactCustomizationManager;
