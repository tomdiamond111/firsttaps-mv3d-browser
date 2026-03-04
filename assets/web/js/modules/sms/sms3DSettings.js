/**
 * SMS 3D Settings Module
 * Manages user preferences for 3D message balloon display
 */

(function() {
    'use strict';

    const SETTINGS_KEY = 'sms3d_settings';

    // Default settings
    const DEFAULT_SETTINGS = {
        enabled: false, // 3D mode disabled by default
        colorScheme: 'standard',
        textSize: 'medium',
        soundPack: 'standard',
        animationSpeed: 'normal',
        opacity: 0.9
    };

    // Available options
    const COLOR_SCHEMES = {
        standard: {
            outgoing: { base: '#007AFF', text: '#FFFFFF' },
            incoming: { base: '#E5E5EA', text: '#000000' }
        },
        redBlue: {
            outgoing: { base: '#FF3B30', text: '#FFFFFF' },
            incoming: { base: '#007AFF', text: '#FFFFFF' }
        },
        pinkPurple: {
            outgoing: { base: '#FF2D55', text: '#FFFFFF' },
            incoming: { base: '#AF52DE', text: '#FFFFFF' }
        },
        goldSilver: {
            outgoing: { base: '#FFE55C', text: '#000000', glitter: true },
            incoming: { base: '#E8E8E8', text: '#000000', glitter: true }
        }
    };

    const TEXT_SIZES = {
        small: { fontSize: 32, lineHeight: 40, padding: 15 },
        medium: { fontSize: 48, lineHeight: 60, padding: 20 },
        large: { fontSize: 64, lineHeight: 80, padding: 25 }
    };

    const ANIMATION_SPEEDS = {
        slow: 0.3,
        normal: 0.5,
        fast: 0.8
    };

    /**
     * SMS 3D Settings Manager
     */
    class Sms3DSettings {
        constructor() {
            this.settings = this.loadSettings();
            console.log('📱 SMS 3D Settings initialized:', this.settings);
        }

        /**
         * Load settings from localStorage
         */
        loadSettings() {
            try {
                const stored = localStorage.getItem(SETTINGS_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Merge with defaults to ensure all keys exist
                    return { ...DEFAULT_SETTINGS, ...parsed };
                }
            } catch (error) {
                console.error('📱 Error loading SMS 3D settings:', error);
            }
            return { ...DEFAULT_SETTINGS };
        }

        /**
         * Save settings to localStorage
         */
        saveSettings() {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
                console.log('📱 SMS 3D settings saved:', this.settings);
                
                // Notify Flutter side
                this.notifyFlutter();
                
                return true;
            } catch (error) {
                console.error('📱 Error saving SMS 3D settings:', error);
                return false;
            }
        }

        /**
         * Notify Flutter of settings change
         */
        notifyFlutter() {
            if (window.flutter_inappwebview) {
                window.flutter_inappwebview.callHandler('sms3DSettingsChanged', this.settings);
            }
        }

        /**
         * Update a specific setting
         */
        updateSetting(key, value) {
            if (this.settings.hasOwnProperty(key)) {
                this.settings[key] = value;
                this.saveSettings();
                
                // Dispatch event for listeners
                window.dispatchEvent(new CustomEvent('sms3d-setting-changed', {
                    detail: { key, value, settings: this.settings }
                }));
                
                return true;
            }
            console.warn('📱 Unknown setting key:', key);
            return false;
        }

        /**
         * Get current settings
         */
        getSettings() {
            return { ...this.settings };
        }

        /**
         * Get specific setting
         */
        getSetting(key) {
            return this.settings[key];
        }

        /**
         * Check if 3D mode is enabled
         */
        isEnabled() {
            return this.settings.enabled === true;
        }

        /**
         * Enable/disable 3D mode
         */
        setEnabled(enabled) {
            return this.updateSetting('enabled', enabled);
        }

        /**
         * Get color scheme configuration
         */
        getColorScheme() {
            return COLOR_SCHEMES[this.settings.colorScheme] || COLOR_SCHEMES.standard;
        }

        /**
         * Get text size configuration
         */
        getTextSize() {
            return TEXT_SIZES[this.settings.textSize] || TEXT_SIZES.medium;
        }

        /**
         * Get animation speed
         */
        getAnimationSpeed() {
            return ANIMATION_SPEEDS[this.settings.animationSpeed] || ANIMATION_SPEEDS.normal;
        }

        /**
         * Get available options for UI
         */
        static getAvailableOptions() {
            return {
                colorSchemes: Object.keys(COLOR_SCHEMES),
                textSizes: Object.keys(TEXT_SIZES),
                soundPacks: ['standard', 'retro', 'futuristic', 'none'],
                animationSpeeds: Object.keys(ANIMATION_SPEEDS)
            };
        }

        /**
         * Reset to defaults
         */
        resetToDefaults() {
            this.settings = { ...DEFAULT_SETTINGS };
            this.saveSettings();
            console.log('📱 SMS 3D settings reset to defaults');
        }
    }

    // Create global instance
    window.Sms3DSettings = new Sms3DSettings();

    // Listen for Flutter 3D settings updates via CustomEvent
    window.addEventListener('flutter-3d-settings', (event) => {
        const { action, data} = event.detail || {};
        console.log(`🎈 Received Flutter 3D settings event: ${action}`, data);
        
        if (action === 'sync_all_settings') {
            // Update all settings at once
            Object.keys(data).forEach(key => {
                if (window.Sms3DSettings.settings.hasOwnProperty(key)) {
                    window.Sms3DSettings.settings[key] = data[key];
                }
            });
            window.Sms3DSettings.saveSettings();
            console.log('🎈 Synced all settings from Flutter:', data);
            
            // DON'T auto-enable balloons for all contacts
            // User toggles balloons per contact manually
        } else if (action === 'setting_changed') {
            // Update single setting
            const { key, value } = data;
            window.Sms3DSettings.updateSetting(key, value);
            console.log(`🎈 Updated setting from Flutter: ${key} = ${value}`);
        }
    });

    // Listen for our own setting changes (from updateSetting)
    window.addEventListener('sms3d-setting-changed', (event) => {
        const { key, value } = event.detail || {};
        
        // DON'T auto-enable/disable balloons for all contacts when global setting changes
        // Users should manually toggle balloons per contact
        // Only refresh appearance of already-enabled balloons
        if (key === 'colorScheme' || key === 'textSize' || key === 'animationSpeed') {
            // Refresh all existing balloons with new settings
            refreshAllContactBalloons();
        }
    });

    /**
     * Refresh all contact balloons (when settings like color or size change)
     * ONLY refreshes balloons for contacts that currently have balloons ENABLED
     */
    function refreshAllContactBalloons() {
        try {
            console.log('🎈 Refreshing balloons with new settings (only for contacts with balloons currently enabled)...');
            
            const contactManager = window.getContactManager ? window.getContactManager() : null;
            if (!contactManager) {
                console.log('🎈 ContactManager not ready for balloon refresh');
                return;
            }
            
            const contacts = contactManager.getAllContacts();
            console.log(`🎈 Found ${contacts.length} total contacts`);
            
            let refreshCount = 0;
            contacts.forEach(contact => {
                // CRITICAL FIX: Only refresh if balloons are CURRENTLY ENABLED for this contact
                // Check both balloonManager exists AND that enabled=true for THIS specific contact
                if (contact && contact.balloonManager && contact.balloonManager.enabled === true) {
                    // Update appearance of existing balloons without creating new ones
                    contact.balloonManager.updateSettings();
                    refreshCount++;
                    console.log(`🎈 Updated balloon appearance for ${contact.contactData?.name || 'unknown'}`);
                }
            });
            
            console.log(`🎈 ✅ Balloon refresh complete - updated ${refreshCount} contacts with active balloons`);
        } catch (error) {
            console.error('🎈 ❌ Error refreshing balloons:', error);
        }
    }

    /**
     * Apply balloon mode to all existing contacts
     */
    function applyBalloonModeToContacts(enabled) {
        try {
            console.log(`🎈 Applying balloon mode (${enabled}) to all contacts...`);
            
            // Wait for contactManager to be available
            const contactManager = window.getContactManager ? window.getContactManager() : null;
            if (!contactManager) {
                console.log('🎈 ContactManager not ready yet, will retry in 500ms...');
                setTimeout(() => applyBalloonModeToContacts(enabled), 500);
                return;
            }
            
            // Get all contacts and toggle their balloon mode
            const contacts = contactManager.getAllContacts();
            console.log(`🎈 Found ${contacts.length} contacts to update`);
            
            contacts.forEach(contact => {
                if (contact && typeof contact.toggle3DBalloonMode === 'function') {
                    contact.toggle3DBalloonMode(enabled);
                    console.log(`🎈 ${enabled ? 'Enabled' : 'Disabled'} balloons for ${contact.contactData?.name || 'unknown'}`);
                }
            });
            
            console.log(`🎈 ✅ Balloon mode update complete - ${enabled ? 'enabled' : 'disabled'} for ${contacts.length} contacts`);
        } catch (error) {
            console.error('🎈 ❌ Error applying balloon mode:', error);
        }
    }

    console.log('📱 SMS 3D Settings module loaded');

})();
