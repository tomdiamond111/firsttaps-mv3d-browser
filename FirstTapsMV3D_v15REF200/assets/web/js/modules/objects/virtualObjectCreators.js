// modules/objects/virtualObjectCreators.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.VirtualObjectCreator

(function() {
    'use strict';
    
    console.log("Loading VirtualObjectCreator module...");
    
    // ============================================================================
    // VIRTUAL OBJECT CREATION (APPS, URLS, ETC.)
    // ============================================================================
    class VirtualObjectCreator {
        constructor(THREE) {
            this.THREE = THREE;
            this.initializeAppMaterials();
        }

        // Initialize materials for app objects
        initializeAppMaterials() {
            // Initialize app icon database
            this.initializeAppIconDatabase();
            
            // Create app icon texture base
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Create app icon background with gradient
            const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            gradient.addColorStop(0, '#4A90E2');
            gradient.addColorStop(1, '#2C5282');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 128, 128);
            
            // Add app icon border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.strokeRect(8, 8, 112, 112);
            
            // Add app icon symbol (generic app icon)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📱', 64, 64);
            
            this.appIconTexture = new this.THREE.CanvasTexture(canvas);
            this.appIconTexture.needsUpdate = true;
            
            // Create app materials
            this.appMaterials = {
                main: new this.THREE.MeshLambertMaterial({
                    map: this.appIconTexture,
                    transparent: true,
                    opacity: 0.9
                }),
                side: new this.THREE.MeshLambertMaterial({
                    color: 0x4A90E2,
                    transparent: true,
                    opacity: 0.8
                }),
                highlight: new this.THREE.MeshLambertMaterial({
                    color: 0x6BB6FF,
                    transparent: true,
                    opacity: 0.9
                })
            };
        }

        /**
         * Initialize database of app icons and brand colors
         * This provides official branding for popular apps
         */
        initializeAppIconDatabase() {
            // Expanded app icon database with brand colors and icons
            this.appIconDatabase = {
                // Google Apps
                'chrome': { icon: '🌐', color: '#4285F4', name: 'Chrome' },
                'gmail': { icon: '📧', color: '#EA4335', name: 'Gmail' },
                'google': { icon: 'G', color: '#4285F4', name: 'Google' },
                'drive': { icon: '📁', color: '#4285F4', name: 'Google Drive' },
                'photos': { icon: '📷', color: '#4285F4', name: 'Google Photos' },
                'maps': { icon: '🗺️', color: '#4285F4', name: 'Google Maps' },
                'youtube': { icon: '▶️', color: '#FF0000', name: 'YouTube' },
                
                // Microsoft Apps
                'outlook': { icon: '📮', color: '#0078D4', name: 'Outlook' },
                'word': { icon: 'W', color: '#2B579A', name: 'Microsoft Word' },
                'excel': { icon: 'X', color: '#217346', name: 'Microsoft Excel' },
                'powerpoint': { icon: 'P', color: '#D24726', name: 'PowerPoint' },
                'teams': { icon: '👥', color: '#6264A7', name: 'Microsoft Teams' },
                'onedrive': { icon: '☁️', color: '#0078D4', name: 'OneDrive' },
                
                // Social Media
                'facebook': { icon: 'f', color: '#1877F2', name: 'Facebook' },
                'instagram': { icon: '📸', color: '#E4405F', name: 'Instagram' },
                'twitter': { icon: '🐦', color: '#1DA1F2', name: 'Twitter' },
                'linkedin': { icon: '💼', color: '#0A66C2', name: 'LinkedIn' },
                'snapchat': { icon: '👻', color: '#FFFC00', name: 'Snapchat' },
                'tiktok': { icon: '🎵', color: '#000000', name: 'TikTok' },
                'discord': { icon: '💬', color: '#5865F2', name: 'Discord' },
                'slack': { icon: '💬', color: '#4A154B', name: 'Slack' },
                'whatsapp': { icon: '💬', color: '#25D366', name: 'WhatsApp' },
                'telegram': { icon: '💬', color: '#0088CC', name: 'Telegram' },
                'reddit': { icon: '🤖', color: '#FF4500', name: 'Reddit' },
                
                // Entertainment
                'spotify': { icon: '🎵', color: '#1DB954', name: 'Spotify' },
                'netflix': { icon: '🎬', color: '#E50914', name: 'Netflix' },
                'hulu': { icon: '📺', color: '#1CE783', name: 'Hulu' },
                'disney': { icon: '🏰', color: '#113CCF', name: 'Disney+' },
                'twitch': { icon: '🎮', color: '#9146FF', name: 'Twitch' },
                'steam': { icon: '🎮', color: '#1B2838', name: 'Steam' },
                'apple music': { icon: '🎵', color: '#FA243C', name: 'Apple Music' },
                'amazon music': { icon: '🎵', color: '#FF9900', name: 'Amazon Music' },
                
                // Productivity
                'zoom': { icon: '📹', color: '#2D8CFF', name: 'Zoom' },
                'skype': { icon: '📞', color: '#00AFF0', name: 'Skype' },
                'notion': { icon: '📝', color: '#000000', name: 'Notion' },
                'dropbox': { icon: '📦', color: '#0061FF', name: 'Dropbox' },
                'adobe': { icon: 'A', color: '#FF0000', name: 'Adobe' },
                'photoshop': { icon: 'Ps', color: '#31A8FF', name: 'Photoshop' },
                'evernote': { icon: '📝', color: '#00A82D', name: 'Evernote' },
                'trello': { icon: '📋', color: '#0079BF', name: 'Trello' },
                
                // Shopping & Finance
                'amazon': { icon: '📦', color: '#FF9900', name: 'Amazon' },
                'amazon kids': { icon: '📦', color: '#FF9900', name: 'Amazon Kids' },
                'paypal': { icon: '💳', color: '#003087', name: 'PayPal' },
                'venmo': { icon: '💸', color: '#008CFF', name: 'Venmo' },
                'target': { icon: '🎯', color: '#CC0000', name: 'Target' },
                'walmart': { icon: '🛒', color: '#0071CE', name: 'Walmart' },
                'ebay': { icon: '💰', color: '#0064D2', name: 'eBay' },
                'etsy': { icon: '🛍️', color: '#F16521', name: 'Etsy' },
                
                // Transportation
                'uber': { icon: '🚗', color: '#000000', name: 'Uber' },
                'lyft': { icon: '�', color: '#FF00BF', name: 'Lyft' },
                'grubhub': { icon: '🍕', color: '#FF8000', name: 'Grubhub' },
                'doordash': { icon: '🥡', color: '#FF3008', name: 'DoorDash' },
                'uber eats': { icon: '🍔', color: '#000000', name: 'Uber Eats' },
                
                // Travel
                'airbnb': { icon: '🏠', color: '#FF5A5F', name: 'Airbnb' },
                'booking': { icon: '🏨', color: '#003580', name: 'Booking.com' },
                'expedia': { icon: '✈️', color: '#FCC72C', name: 'Expedia' },
                
                // Browsers
                'brave': { icon: '🦁', color: '#FB542B', name: 'Brave' },
                'firefox': { icon: '🔥', color: '#FF7139', name: 'Firefox' },
                'safari': { icon: '🧭', color: '#006CFF', name: 'Safari' },
                'opera': { icon: '⭕', color: '#FF1B2D', name: 'Opera' },
                'edge': { icon: '🌐', color: '#0078D7', name: 'Microsoft Edge' },
                
                // Development
                'github': { icon: '⚡', color: '#181717', name: 'GitHub' },
                'vscode': { icon: '💻', color: '#007ACC', name: 'VS Code' },
                'figma': { icon: '🎨', color: '#F24E1E', name: 'Figma' },
                'xcode': { icon: '🔨', color: '#147EFB', name: 'Xcode' },
                'android studio': { icon: '🤖', color: '#3DDC84', name: 'Android Studio' },
                
                // System utilities
                'clock': { icon: '⏰', color: '#4A90E2', name: 'Clock' },
                'calculator': { icon: '🔢', color: '#FF9500', name: 'Calculator' },
                'calendar': { icon: '📅', color: '#FF3B30', name: 'Calendar' },
                'notes': { icon: '📝', color: '#FFCC02', name: 'Notes' },
                'weather': { icon: '🌤️', color: '#007AFF', name: 'Weather' },
                'camera': { icon: '📷', color: '#8E8E93', name: 'Camera' },
                'settings': { icon: '⚙️', color: '#8E8E93', name: 'Settings' },
                'files': { icon: '📁', color: '#007AFF', name: 'Files' },
                'gallery': { icon: '🖼️', color: '#4A90E2', name: 'Gallery' },
                
                // Telecom and utilities
                'att': { icon: '📱', color: '#00A8E6', name: 'AT&T' },
                'at&t': { icon: '📱', color: '#00A8E6', name: 'AT&T' },
                'protech': { icon: '📱', color: '#00A8E6', name: 'AT&T ProTech' },
                'verizon': { icon: '📶', color: '#CD040B', name: 'Verizon' },
                'tmobile': { icon: '📲', color: '#E20074', name: 'T-Mobile' },
                't-mobile': { icon: '📲', color: '#E20074', name: 'T-Mobile' },
                
                // Gaming
                'candy crush': { icon: '🍭', color: '#FFB900', name: 'Candy Crush' },
                'clash of clans': { icon: '⚔️', color: '#FFC40C', name: 'Clash of Clans' },
                'pokemon go': { icon: '🐾', color: '#3761A8', name: 'Pokémon GO' },
                'fortnite': { icon: '🎮', color: '#8A2BE2', name: 'Fortnite' },
                'minecraft': { icon: '🟫', color: '#8B4513', name: 'Minecraft' },
                
                // News and media
                'cnn': { icon: '📰', color: '#CC0000', name: 'CNN' },
                'flipboard': { icon: '📖', color: '#E12828', name: 'Flipboard' },
                'medium': { icon: '📖', color: '#000000', name: 'Medium' },
                
                // Crypto and finance
                'coinbase': { icon: '₿', color: '#0052FF', name: 'Coinbase' },
                'robinhood': { icon: '📈', color: '#00C805', name: 'Robinhood' },
                'chase': { icon: '🏦', color: '#117ACA', name: 'Chase' },
                'wells fargo': { icon: '🏦', color: '#D71921', name: 'Wells Fargo' },
                'bank of america': { icon: '🏦', color: '#E31837', name: 'Bank of America' }
            };
        }

        /**
         * Get app icon data based on app name
         * @param {string} appName - Name of the app
         * @returns {Object} - Icon data with icon, color, and clean name
         */
        getAppIconData(appName) {
            if (!appName) return { icon: '📱', color: '#4A90E2', name: 'App' };
            
            const searchName = appName.toLowerCase();
            
            // Direct match first
            if (this.appIconDatabase[searchName]) {
                return this.appIconDatabase[searchName];
            }
            
            // Partial match for apps with complex names
            for (const [key, value] of Object.entries(this.appIconDatabase)) {
                if (searchName.includes(key) || key.includes(searchName)) {
                    return value;
                }
            }
            
            // Check for common patterns
            if (searchName.includes('chrome') || searchName.includes('browser')) {
                return this.appIconDatabase.chrome;
            }
            if (searchName.includes('mail') && !searchName.includes('gmail')) {
                return this.appIconDatabase.outlook;
            }
            if (searchName.includes('video') || searchName.includes('player')) {
                return { icon: '🎬', color: '#333333', name: 'Video Player' };
            }
            if (searchName.includes('music') || searchName.includes('audio')) {
                return { icon: '🎵', color: '#FF6B6B', name: 'Music Player' };
            }
            if (searchName.includes('game')) {
                return { icon: '🎮', color: '#9B59B6', name: 'Game' };
            }
            
            // Default app icon
            return { icon: '📱', color: '#4A90E2', name: appName };
        }

        // Create standardized geometry for link objects with 16:9 aspect ratio
        createStandardizedLinkGeometry() {
            // Force 16:9 aspect ratio for ALL link objects - 2x larger for better thumbnail visibility
            const aspectRatio = 16/9;
            const width = 4.5;  // 2x larger than previous 2.0
            const height = width / aspectRatio;  // 2.53 units for 16:9 ratio
            const depth = 0.4;  // Moderate depth for video content
            
            if (window.shouldLog && window.shouldLog('geometry')) {
                console.log(`📐 Creating standardized link geometry: ${width} x ${height} x ${depth} (16:9 ratio)`);
            }
            return new this.THREE.BoxGeometry(width, height, depth);
        }

        // Create larger geometry specifically for app objects
        createAppGeometry() {
            // App objects should fit grid spacing (6 units) and be prominent
            // Width: 4.5 units (fits in 6-unit grid with spacing)
            // Height: 50% taller than standard 16:9 ratio for better visibility
            const standardAspectRatio = 16/9;
            const width = 4.5; // Fits in grid with room for spacing
            const standardHeight = width / standardAspectRatio; // ~2.53
            const height = standardHeight * 1.5; // 50% taller = ~3.8
            const depth = 0.3; // Keep depth proportional
            
            console.log(`📐 Creating app geometry: ${width} x ${height} x ${depth} (grid-fit, 50% taller than 16:9)`);
            return new this.THREE.BoxGeometry(width, height, depth);
        }

        // Create standardized link geometry with 16:9 aspect ratio
        createLinkGeometry() {
            // Force 16:9 aspect ratio for ALL link objects - 2x larger for better thumbnail visibility
            const aspectRatio = 16/9;
            const width = 4.5;  // 2x larger than previous 2.0
            const height = width / aspectRatio;  // 2.53 units for 16:9 ratio
            const depth = 0.4;  // Moderate depth for video content
            
            if (window.shouldLog && window.shouldLog('geometry')) {
                console.log(`📐 Creating standardized link geometry: ${width} x ${height} x ${depth} (16:9 ratio)`);
            }
            return new this.THREE.BoxGeometry(width, height, depth);
        }

        // Create app object in 3D space
        createAppObject(appData, position = { x: 0, y: 0, z: 0 }) {
            // console.log('Creating app object:', appData.name);
            
            // Create material with app-specific customization
            const material = this.createAppMaterial(appData);
            
            // Create geometry - check if we need multi-material support
            let geometry;
            let mesh;
            
            // CRITICAL FIX: Use correct geometry from the start for link objects
            let appGeometry;
            if (appData.url) {
                // Link objects: use 16:9 link geometry from the start
                appGeometry = this.createLinkGeometry();
                if (window.shouldLog && window.shouldLog('linkCreation')) {
                    console.log('🔗 Using link geometry for URL-based object:', appData.name);
                }
            } else {
                // Regular app objects: use standard app geometry
                appGeometry = this.createAppGeometry();
                if (window.shouldLog && window.shouldLog('linkCreation')) {
                    console.log('📱 Using app geometry for regular app object:', appData.name);
                }
            }
            
            if (Array.isArray(material)) {
                // Multi-material for face textures - create box with proper face grouping
                geometry = appGeometry;
                
                // Create mesh with material array
                mesh = new this.THREE.Mesh(geometry, material);
                
                // Link the mesh to the materials array for dynamic updates
                material._mesh = mesh;
                
                console.log('Created app object with multi-material (face texture support)');
            } else {
                // Single material - regular box
                geometry = appGeometry;
                mesh = new this.THREE.Mesh(geometry, material);
                // console.log('Created app object with single material');
            }
            
            // Position the object
            mesh.position.set(position.x, position.y, position.z);
            
            // Add user data for identification and interaction
            mesh.userData = {
                type: 'app',
                appData: appData,
                packageName: appData.packageName,
                appName: appData.name,
                fileName: appData.name,
                id: `app_${appData.packageName}`, // Use app_ format to match persistence system
                fileData: {
                    name: appData.name,
                    extension: 'app',
                    path: appData.path || `app_${appData.packageName}`, // DEMO FIX: Use appData.path if available (e.g., "assets/demomedia/file.mp4")
                    isApp: true,
                    packageName: appData.packageName,
                    isDemoContent: appData.isDemoContent || false, // DEMO FIX: Pass through isDemoContent flag
                    // Store link object data for backup/restore
                    url: appData.url,
                    thumbnailUrl: appData.thumbnailUrl,
                    thumbnailDataUrl: appData.thumbnailDataUrl || appData.thumbnailUrl,
                    linkType: appData.linkType,
                    title: appData.title,
                    width: 4.5,      // Standard width for all objects
                    height: appData.url ? 4.5 / (16/9) : 4.5 / (16/9) * 1.5, // Link objects: 16:9 ratio, App objects: 50% taller
                    depth: appData.url ? 0.4 : 0.3,      // Link objects: 0.4 depth, App objects: 0.3 depth
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                // DEMO FIX: Store path at top level for media preview system
                path: appData.path || null,
                isDemoContent: appData.isDemoContent || false,
                // Also store URL at top level for media preview system
                // CRITICAL FIX: For demo files (local media), url should be the path
                url: appData.url || (appData.isDemoContent ? appData.path : null),
                thumbnailUrl: appData.thumbnailUrl,
                // Also store in the top level for easy access
                thumbnailDataUrl: appData.thumbnailDataUrl || appData.thumbnailUrl,
                originalPosition: { ...position },
                isInteractable: true,
                canLaunch: true
            };
            
            // console.log('Created app object:', {
            //     name: appData.name,
            //     packageName: appData.packageName,
            //     finalId: mesh.userData.id,
            //     position: position
            // });
            
            // APPLY NEW BRANDING SYSTEM
            if (window.app && window.app.brandingService && window.app.brandingService.isReady()) {
                // console.log('🎨 Applying new branding system to app object...');
                setTimeout(() => {
                    try {
                        const success = window.app.brandingService.applyBranding(mesh, appData);
                        if (success) {
                            // console.log('✅ New branding applied successfully to:', appData.name);
                        } else {
                            console.warn('⚠️ Branding application failed for:', appData.name);
                        }
                    } catch (error) {
                        console.error('❌ Error applying branding:', error);
                    }
                }, 50); // Small delay to ensure mesh is ready
            } else {
                console.log('⚠️ BrandingService not available, using default material');
            }
            
            // PHASE 5A: Apply visual enhancements for link objects
            if (appData.url && window.app && window.app.linkVisualManager) {
                // This is a link object, apply visual enhancements
                setTimeout(async () => {
                    try {
                        const linkData = {
                            url: appData.url,
                            title: appData.name || appData.title,
                            name: appData.name
                        };
                        
                        await window.app.linkVisualManager.enhanceLinkObject(mesh, linkData);
                        
                    } catch (error) {
                        console.warn('⚠️ Error applying visual enhancements to app-based link object:', error);
                    }
                }, 100); // Small delay to ensure the object is fully initialized
            }
            
            return mesh;
        }

        // Create app-specific material
        createAppMaterial(appData) {
            console.log('🎨 Creating app material with new branding system for:', appData.name);
            
            // Check if new branding system is available
            if (window.BrandingService && window.app && window.app.brandingService && window.app.brandingService.isReady()) {
                console.log('✅ Using new BrandingService for material creation');
                // The BrandingService will handle material creation in applyBranding()
                // Return a temporary material that will be replaced by branding
                return this.createTemporaryAppMaterial(appData);
            } else {
                console.log('⚠️ BrandingService not available, using legacy system');
                // Fallback to original system
                return this.createDefaultAppMaterial(appData);
            }
        }

        // Create temporary material for apps (will be replaced by branding system)
        createTemporaryAppMaterial(appData) {
            // Simple blue material that will be replaced by branding
            const tempColor = 0x4A90E2;
            return new this.THREE.MeshStandardMaterial({
                color: tempColor,
                metalness: 0.3,
                roughness: 0.1,
                transparent: true,
                opacity: 0.95
            });
        }

        createDefaultAppMaterial(appData) {
            console.log('🎨 Creating default app material for:', appData.name);
            
            // Get app icon data from database (includes official icons/colors if available)
            const iconData = this.getAppIconData(appData.name);
            console.log('🔍 Icon data found:', iconData);
            
            // Create canvas for app icon - larger size for better text rendering
            const canvas = document.createElement('canvas');
            canvas.width = 512;  // Increased for better quality
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Use brand color if available, otherwise default blue
            const brandColor = iconData.color || '#4A90E2';
            const brandColorDark = this.darkenColor(brandColor, 0.3);
            
            // Draw app icon background with brand-colored glass gradient
            const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
            gradient.addColorStop(0, brandColor);      // Brand color center
            gradient.addColorStop(1, brandColorDark);  // Darker brand color edges
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 512, 512);
            
            // Add glass effect with subtle highlight
            const glassGradient = ctx.createLinearGradient(0, 0, 0, 256);
            glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            ctx.fillStyle = glassGradient;
            ctx.fillRect(0, 0, 512, 256);
            
            // Add rounded corners effect
            ctx.globalCompositeOperation = 'destination-in';
            ctx.beginPath();
            ctx.roundRect(32, 32, 448, 448, 64);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            
            // Draw content with better text handling
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            // First try to display a simple logo image or text
            if (iconData.logoImage) {
                // Use logo image if available (this would be for future enhancement)
                console.log(`📋 Using logo image for "${appData.name}"`);
            } else {
                // Use clean app name in large, readable font - no emojis
                ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
                const cleanName = this.cleanAppName(appData.name);
                ctx.fillText(cleanName, 256, 256);
                
                console.log(`✅ Rendered clean app name: "${cleanName}" (no emoji - using text logo)`);
            }
            
            // Create texture
            const texture = new this.THREE.CanvasTexture(canvas);
            texture.flipY = true; // Revert to correct orientation for Three.js
            texture.needsUpdate = true;
            
            return new this.THREE.MeshLambertMaterial({
                map: texture,
                transparent: false, // Changed to false for better visibility
                opacity: 1.0        // Full opacity for solid appearance
            });
        }

        /**
         * Clean app name by removing unwanted characters and truncating
         * @param {string} appName - Raw app name
         * @returns {string} - Clean app name
         */
        cleanAppName(appName) {
            if (!appName) return 'App';
            
            let cleanName = appName;
            
            // Remove all emoji and special characters (keep only letters, numbers, spaces, basic punctuation)
            cleanName = cleanName.replace(/[^\w\s\-\.]/g, '');
            
            // Remove common suffixes and extra info
            cleanName = cleanName.replace(/\s*-\s*.*$/, ''); // Remove everything after " - "
            cleanName = cleanName.replace(/\s*\(.*\)$/, ''); // Remove parentheses content
            cleanName = cleanName.replace(/\s*\|.*$/, '');   // Remove everything after " | "
            cleanName = cleanName.replace(/\s*:.*$/, '');    // Remove everything after " : "
            
            // Remove file extensions if present
            cleanName = cleanName.replace(/\.(exe|app|apk)$/i, '');
            
            // Trim and normalize spaces
            cleanName = cleanName.trim().replace(/\s+/g, ' ');
            
            // Truncate long names to fit nicely
            if (cleanName.length > 20) {
                cleanName = cleanName.substring(0, 18) + '...';
            }
            
            // Capitalize first letter if it's all lowercase
            if (cleanName === cleanName.toLowerCase()) {
                cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            }
            
            console.log(`🧹 Cleaned app name: "${appName}" → "${cleanName}"`);
            return cleanName || 'App';
        }

        /**
         * Darken a hex color by a given factor
         * @param {string} color - Hex color (e.g., '#FF0000')
         * @param {number} factor - Darkening factor (0.0 to 1.0)
         * @returns {string} - Darkened hex color
         */
        darkenColor(color, factor) {
            // Remove # if present
            const hex = color.replace('#', '');
            
            // Parse RGB
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            // Darken each component
            const newR = Math.floor(r * (1 - factor));
            const newG = Math.floor(g * (1 - factor));
            const newB = Math.floor(b * (1 - factor));
            
            // Convert back to hex
            const toHex = (c) => c.toString(16).padStart(2, '0');
            return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
        }

        createAppMaterialWithFaceTexture(appData) {
            console.log('=== CREATING APP OBJECT WITH FACE TEXTURE ===');
            console.log('App data:', appData);
            console.log('Thumbnail URL:', appData.thumbnailUrl);
            
            const baseColor = 0x4A90E2; // Default app object color
            
            // Create materials array for all faces
            const materials = [
                new this.THREE.MeshStandardMaterial({ color: baseColor }), // right
                new this.THREE.MeshStandardMaterial({ color: baseColor }), // left
                new this.THREE.MeshStandardMaterial({ color: baseColor }), // top
                new this.THREE.MeshStandardMaterial({ color: baseColor }), // bottom
                this.createDefaultAppMaterial(appData), // front (fallback to default app icon)
                new this.THREE.MeshStandardMaterial({ color: baseColor })  // back
            ];
            
            // Load the thumbnail image
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Handle CORS for external images
            
            img.onload = () => {
                try {
                    console.log('Thumbnail image loaded successfully');
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const texture = new this.THREE.CanvasTexture(canvas);
                    texture.needsUpdate = true;
                    
                    // Update front face with thumbnail
                    const frontFaceMaterial = new this.THREE.MeshStandardMaterial({ map: texture });
                    materials[4] = frontFaceMaterial; // Replace front face material
                    
                    // Force material update if mesh is already created
                    if (materials._mesh) {
                        console.log('Updating mesh material with loaded thumbnail');
                        // Create new materials array and assign to mesh
                        const newMaterials = [...materials];
                        materials._mesh.material = newMaterials;
                        materials._mesh.material.needsUpdate = true;
                        
                        // Force a render update
                        if (window.app && window.app.renderer) {
                            window.app.renderer.render(window.app.scene, window.app.camera);
                        }
                    }
                    
                    console.log('App object face texture applied successfully');
                } catch (error) {
                    console.error('Error applying face texture to app object:', error);
                }
            };
            
            img.onerror = () => {
                console.log('Failed to load thumbnail, using default app material');
                // Fallback materials are already set up
            };
            
            img.src = appData.thumbnailUrl;
            
            // Return array of materials for multi-material mesh
            return materials;
        }

        // Create app object with specific category styling
        createCategorizedAppObject(appData, category, position = { x: 0, y: 0, z: 0 }) {
            const obj = this.createAppObject(appData, position);
            
            // Add category-specific styling
            this.applyCategoryStyle(obj, category);
            
            return obj;
        }

        // Apply category-specific styling
        applyCategoryStyle(appObject, category) {
            const categoryColors = {
                'productivity': 0x4A90E2,
                'social': 0x50C878,
                'entertainment': 0xFF6B6B,
                'utilities': 0xFFA500,
                'games': 0x9B59B6,
                'default': 0x4A90E2
            };
            
            const color = categoryColors[category] || categoryColors.default;
            
            // Update material color
            if (appObject.material) {
                appObject.material.color.setHex(color);
            }
            
            // Add category to user data
            appObject.userData.category = category;
        }

        // Create app stack (for grouped apps)
        createAppStack(apps, position = { x: 0, y: 0, z: 0 }) {
            console.log('Creating app stack with', apps.length, 'apps');
            
            const stackGroup = new this.THREE.Group();
            
            apps.forEach((appData, index) => {
                const appObject = this.createAppObject(appData, {
                    x: position.x,
                    y: position.y + (index * 0.4), // Stack vertically
                    z: position.z
                });
                
                // Add stack-specific user data
                appObject.userData.stackIndex = index;
                appObject.userData.stackSize = apps.length;
                appObject.userData.isStacked = true;
                
                stackGroup.add(appObject);
            });
            
            // Add stack group user data
            stackGroup.userData = {
                type: 'appStack',
                stackSize: apps.length,
                position: position,
                apps: apps
            };
            
            return stackGroup;
        }

        // Update app object appearance for different states
        updateAppObjectState(appObject, state) {
            if (!appObject || !appObject.material) return;
            
            switch (state) {
                case 'highlighted':
                    appObject.material.opacity = 1.0;
                    appObject.material.emissive.setHex(0x333333);
                    break;
                case 'selected':
                    appObject.material.opacity = 1.0;
                    appObject.material.emissive.setHex(0x666666);
                    break;
                case 'launching':
                    appObject.material.opacity = 0.7;
                    appObject.material.emissive.setHex(0x00FF00);
                    break;
                case 'normal':
                default:
                    appObject.material.opacity = 0.9;
                    appObject.material.emissive.setHex(0x000000);
                    break;
            }
        }

        // Get app object info for debugging
        getAppObjectInfo(appObject) {
            if (!appObject || !appObject.userData) return null;
            
            return {
                name: appObject.userData.appName,
                packageName: appObject.userData.packageName,
                type: appObject.userData.type,
                position: {
                    x: appObject.position.x,
                    y: appObject.position.y,
                    z: appObject.position.z
                },
                isStacked: appObject.userData.isStacked || false,
                category: appObject.userData.category || 'default'
            };
        }
    }

    // Export the class
    window.VirtualObjectCreator = VirtualObjectCreator;
    console.log("VirtualObjectCreator module loaded successfully");
})();
