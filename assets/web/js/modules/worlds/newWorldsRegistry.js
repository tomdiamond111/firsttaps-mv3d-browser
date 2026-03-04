// modules/worlds/newWorldsRegistry.js
// Registration and metadata for new media-focused world templates
// Dependencies: worldTemplateRegistryHelper, world template classes

(function() {
    'use strict';
    
    console.log("📝 Loading New Worlds Registry...");
    
    // Wait for all dependencies to be available
    function registerNewWorlds() {
        if (!window.worldTemplateRegistryHelper) {
            console.warn("📝 worldTemplateRegistryHelper not available yet, will retry...");
            setTimeout(registerNewWorlds, 100);
            return;
        }

        console.log("📝 Registering new media-focused world templates...");

        // ==================================================================
        // RECORD STORE WORLD
        // ==================================================================
        if (window.RecordStoreWorldTemplate) {
            // Add static config method
            window.RecordStoreWorldTemplate.getConfig = function() {
                return {
                    id: 'record-store',
                    displayName: 'Record Store',
                    description: 'Browse your media collection like a vintage record shop',
                    category: 'themed',
                    isPremium: false, // Free world - best default option
                    bundle: 'free',
                    menuIcon: 'store',
                    version: '1.0.0',
                    baseTemplate: 'BaseWorldTemplate',
                    fileZones: {
                        inherits: 'green-plane',
                        type: 'ground-level'
                    }
                };
            };

            window.worldTemplateRegistryHelper.registerNewTemplate(
                window.RecordStoreWorldTemplate,
                {
                    mainApplication: true,
                    worldManagement: true,
                    sortingManager: true,
                    flutterMenu: true
                }
            );
            console.log("✅ Registered: Record Store (Free)");
        }

        // ==================================================================
        // MUSIC FESTIVAL WORLD
        // ==================================================================
        if (window.MusicFestivalWorldTemplate) {
            window.MusicFestivalWorldTemplate.getConfig = function() {
                return {
                    id: 'music-festival',
                    displayName: 'Music Festival',
                    description: 'Evening outdoor concert atmosphere with multiple stages',
                    category: 'themed',
                    isPremium: false, // Free world
                    bundle: 'free',
                    menuIcon: 'festival',
                    version: '1.0.0',
                    baseTemplate: 'BaseWorldTemplate',
                    fileZones: {
                        inherits: 'green-plane',
                        type: 'ground-level'
                    }
                };
            };

            window.worldTemplateRegistryHelper.registerNewTemplate(
                window.MusicFestivalWorldTemplate,
                {
                    mainApplication: true,
                    worldManagement: true,
                    sortingManager: true,
                    flutterMenu: true
                }
            );
            console.log("✅ Registered: Music Festival (Free)");
        }

        // ==================================================================
        // MODERN GALLERY - CLEAN
        // ==================================================================
        if (window.ModernGalleryCleanTemplate) {
            window.ModernGalleryCleanTemplate.getConfig = function() {
                return {
                    id: 'modern-gallery-clean',
                    displayName: 'Modern Gallery (Clean)',
                    description: 'Minimal white gallery with soft purple ambience',
                    category: 'themed',
                    isPremium: false, // Free world
                    bundle: 'free',
                    menuIcon: 'museum',
                    version: '1.0.0',
                    baseTemplate: 'BaseWorldTemplate',
                    fileZones: {
                        inherits: 'green-plane',
                        type: 'ground-level'
                    }
                };
            };

            window.worldTemplateRegistryHelper.registerNewTemplate(
                window.ModernGalleryCleanTemplate,
                {
                    mainApplication: true,
                    worldManagement: true,
                    sortingManager: true,
                    flutterMenu: true
                }
            );
            console.log("✅ Registered: Modern Gallery Clean (Free)");
        }

        // ==================================================================
        // MODERN GALLERY - DARK (Free)
        // ==================================================================
        if (window.ModernGalleryDarkTemplate) {
            window.ModernGalleryDarkTemplate.getConfig = function() {
                return {
                    id: 'modern-gallery-dark',
                    displayName: 'Modern Gallery (Dark)',
                    description: 'Sophisticated charcoal gallery with warm lighting',
                    category: 'themed',
                    isPremium: false, // Free world
                    bundle: 'free',
                    menuIcon: 'museum',
                    version: '1.0.0',
                    baseTemplate: 'BaseWorldTemplate',
                    fileZones: {
                        inherits: 'green-plane',
                        type: 'ground-level'
                    }
                };
            };

            window.worldTemplateRegistryHelper.registerNewTemplate(
                window.ModernGalleryDarkTemplate,
                {
                    mainApplication: true,
                    worldManagement: true,
                    sortingManager: true,
                    flutterMenu: true
                }
            );
            console.log("✅ Registered: Modern Gallery Dark (Free)");
        }

        // ==================================================================
        // MODERN GALLERY - WARM (Free)
        // ==================================================================
        if (window.ModernGalleryWarmTemplate) {
            window.ModernGalleryWarmTemplate.getConfig = function() {
                return {
                    id: 'modern-gallery-warm',
                    displayName: 'Modern Gallery (Warm)',
                    description: 'Elegant gallery with soft blush and warm neutrals',
                    category: 'themed',
                    isPremium: false, // Free world
                    bundle: 'free',
                    menuIcon: 'museum',
                    version: '1.0.0',
                    baseTemplate: 'BaseWorldTemplate',
                    fileZones: {
                        inherits: 'green-plane',
                        type: 'ground-level'
                    }
                };
            };

            window.worldTemplateRegistryHelper.registerNewTemplate(
                window.ModernGalleryWarmTemplate,
                {
                    mainApplication: true,
                    worldManagement: true,
                    sortingManager: true,
                    flutterMenu: true
                }
            );
            console.log("✅ Registered: Modern Gallery Warm (Free)");
        }

        // ==================================================================
        // FUTURISTIC CAR GALLERY (Free)
        // ==================================================================
        if (window.FutureCarGalleryWorldTemplate) {
            window.FutureCarGalleryWorldTemplate.getConfig = function() {
                return {
                    id: 'future-car-gallery',
                    displayName: 'Car Gallery',
                    description: 'Sleek automotive-inspired media interface',
                    category: 'themed',
                    isPremium: false, // Free world
                    bundle: 'free',
                    menuIcon: 'directions_car',
                    version: '1.0.0',
                    baseTemplate: 'BaseWorldTemplate',
                    fileZones: {
                        inherits: 'green-plane',
                        type: 'ground-level'
                    }
                };
            };

            window.worldTemplateRegistryHelper.registerNewTemplate(
                window.FutureCarGalleryWorldTemplate,
                {
                    mainApplication: true,
                    worldManagement: true,
                    sortingManager: true,
                    flutterMenu: true
                }
            );
            console.log("✅ Registered: Car Gallery (Free)");
        }

        console.log("📝 New world templates registration complete");
        console.log("📝 All new MV3D worlds are FREE:");
        console.log("📝   - Record Store, Music Festival");
        console.log("📝   - Modern Gallery (Clean, Dark, Warm)");
        console.log("📝   - Car Gallery");
    }

    // Start registration after DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerNewWorlds);
    } else {
        registerNewWorlds();
    }
    
})();
