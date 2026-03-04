// modules/branding/brandDatabase.js
// Enhanced Brand Database for App Object Branding System
// Dependencies: None (pure data module)
// Exports: window.BrandDatabase

(function() {
    'use strict';
    console.log("Loading BrandDatabase module...");

    // ============================================================================
    // ENHANCED BRAND DATABASE
    // ============================================================================
    
    /**
     * Enhanced brand database with comprehensive visual attributes
     * Supports solid, glossy materials with large text rendering
     */
    const BRAND_DATABASE = {
        // Social Media & Communication - Tier 1
        'youtube': {
            name: 'YouTube',
            primaryColor: '#FF0000',
            secondaryColor: '#CC0000',
            textColor: '#FFFFFF',
            fontFamily: 'Roboto',
            materialFinish: 'glossy',
            gradientColors: ['#FF0000', '#CC0000']
        },
        
        'facebook': {
            name: 'Facebook',
            primaryColor: '#4267B2',
            secondaryColor: '#365899',
            textColor: '#FFFFFF',
            fontFamily: 'Helvetica Neue',
            materialFinish: 'glossy',
            gradientColors: ['#4267B2', '#365899']
        },
        
        'instagram': {
            name: 'Instagram',
            primaryColor: '#E4405F',
            secondaryColor: '#C13584',
            textColor: '#FFFFFF',
            fontFamily: 'Instagram Sans',
            materialFinish: 'glossy',
            gradientColors: ['#F58529', '#E4405F', '#C13584']
        },
        
        'tiktok': {
            name: 'TikTok',
            primaryColor: '#000000',
            secondaryColor: '#25F4EE',
            textColor: '#FFFFFF',
            fontFamily: 'TikTok Sans',
            materialFinish: 'glossy',
            gradientColors: ['#000000', '#25F4EE']
        },
        
        'whatsapp': {
            name: 'WhatsApp',
            primaryColor: '#25D366',
            secondaryColor: '#128C7E',
            textColor: '#FFFFFF',
            fontFamily: 'Helvetica Neue',
            materialFinish: 'glossy',
            gradientColors: ['#25D366', '#128C7E']
        },
        
        'snapchat': {
            name: 'Snapchat',
            primaryColor: '#FFFC00',
            secondaryColor: '#FFF700',
            textColor: '#000000',
            fontFamily: 'Avenir Next',
            materialFinish: 'glossy',
            gradientColors: ['#FFFC00', '#FFF700']
        },
        
        // E-commerce & Shopping
        'amazon': {
            name: 'Amazon',
            primaryColor: '#FF9900',
            secondaryColor: '#E88B00',
            textColor: '#000000',
            fontFamily: 'Amazon Ember',
            materialFinish: 'glossy',
            gradientColors: ['#FF9900', '#E88B00']
        },
        
        'walmart': {
            name: 'Walmart',
            primaryColor: '#0071CE',
            secondaryColor: '#004C87',
            textColor: '#FFFFFF',
            fontFamily: 'Myriad Pro',
            materialFinish: 'glossy',
            gradientColors: ['#0071CE', '#004C87']
        },
        
        'target': {
            name: 'Target',
            primaryColor: '#CC0000',
            secondaryColor: '#B30000',
            textColor: '#FFFFFF',
            fontFamily: 'Helvetica Neue',
            materialFinish: 'glossy',
            gradientColors: ['#CC0000', '#B30000']
        },
        
        'shein': {
            name: 'Shein',
            primaryColor: '#000000',
            secondaryColor: '#333333',
            textColor: '#FFFFFF',
            fontFamily: 'Custom Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#000000', '#333333']
        },
        
        'temu': {
            name: 'Temu',
            primaryColor: '#FF6A00',
            secondaryColor: '#E55A00',
            textColor: '#FFFFFF',
            fontFamily: 'Rounded Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#FF6A00', '#E55A00']
        },
        
        'costco': {
            name: 'Costco',
            primaryColor: '#CC0000',
            secondaryColor: '#0071CE',
            textColor: '#FFFFFF',
            fontFamily: 'Helvetica',
            materialFinish: 'glossy',
            gradientColors: ['#CC0000', '#0071CE']
        },
        
        // Entertainment & Media
        'netflix': {
            name: 'Netflix',
            primaryColor: '#000000',
            secondaryColor: '#E50914',
            textColor: '#E50914',
            fontFamily: 'Netflix Sans',
            materialFinish: 'glossy',
            gradientColors: ['#000000', '#1A1A1A']
        },
        
        'spotify': {
            name: 'Spotify',
            primaryColor: '#1DB954',
            secondaryColor: '#1AA34A',
            textColor: '#000000',
            fontFamily: 'Circular',
            materialFinish: 'glossy',
            gradientColors: ['#1DB954', '#1AA34A']
        },
        
        'disney': {
            name: 'Disney',
            primaryColor: '#113CCF',
            secondaryColor: '#0E32B8',
            textColor: '#FFFFFF',
            fontFamily: 'Waltograph',
            materialFinish: 'glossy',
            gradientColors: ['#113CCF', '#0E32B8']
        },
        
        'apple tv': {
            name: 'Apple TV',
            primaryColor: '#000000',
            secondaryColor: '#333333',
            textColor: '#FFFFFF',
            fontFamily: 'SF Pro',
            materialFinish: 'glossy',
            gradientColors: ['#000000', '#333333']
        },
        
        // Finance & Payments
        'venmo': {
            name: 'Venmo',
            primaryColor: '#3D95CE',
            secondaryColor: '#2980B9',
            textColor: '#FFFFFF',
            fontFamily: 'Gotham Rounded',
            materialFinish: 'glossy',
            gradientColors: ['#3D95CE', '#2980B9']
        },
        
        'zelle': {
            name: 'Zelle',
            primaryColor: '#6F2DA8',
            secondaryColor: '#5B2486',
            textColor: '#FFFFFF',
            fontFamily: 'Custom Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#6F2DA8', '#5B2486']
        },
        
        'cash app': {
            name: 'Cash App',
            primaryColor: '#00D632',
            secondaryColor: '#00C12A',
            textColor: '#FFFFFF',
            fontFamily: 'Custom Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#00D632', '#00C12A']
        },
        
        'chase mobile': {
            name: 'Chase',
            primaryColor: '#0066B2',
            secondaryColor: '#004D87',
            textColor: '#FFFFFF',
            fontFamily: 'ChaseType',
            materialFinish: 'glossy',
            gradientColors: ['#0066B2', '#004D87']
        },
        
        'chase': {
            name: 'Chase',
            primaryColor: '#0066B2',
            secondaryColor: '#004D87',
            textColor: '#FFFFFF',
            fontFamily: 'ChaseType',
            materialFinish: 'glossy',
            gradientColors: ['#0066B2', '#004D87']
        },
        
        'visa': {
            name: 'Visa',
            primaryColor: '#1A1F71',
            secondaryColor: '#FFD700',
            textColor: '#FFFFFF',
            fontFamily: 'Visa Sans',
            materialFinish: 'glossy',
            gradientColors: ['#1A1F71', '#0E1450']
        },
        
        // Technology & Apps
        'apple': {
            name: 'Apple',
            primaryColor: '#000000',
            secondaryColor: '#FFFFFF',
            textColor: '#FFFFFF',
            fontFamily: 'SF Pro',
            materialFinish: 'glossy',
            gradientColors: ['#000000', '#333333']
        },
        
        'google': {
            name: 'Google',
            primaryColor: '#4285F4',
            secondaryColor: '#3367D6',
            textColor: '#FFFFFF',
            fontFamily: 'Google Sans',
            materialFinish: 'glossy',
            gradientColors: ['#4285F4', '#3367D6']
        },
        
        'gmail': {
            name: 'Gmail',
            primaryColor: '#FFFFFF',
            secondaryColor: '#EA4335',
            textColor: '#000000',
            fontFamily: 'Google Sans',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        'google maps': {
            name: 'Google Maps',
            primaryColor: '#FFFFFF',
            secondaryColor: '#4285F4',
            textColor: '#000000',
            fontFamily: 'Google Sans',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        // Food & Restaurants
        'mcdonalds': {
            name: 'McDonald\'s',
            primaryColor: '#FFC72C',
            secondaryColor: '#FFBF00',
            textColor: '#DA020E',
            fontFamily: 'Lovin\' Sans',
            materialFinish: 'glossy',
            gradientColors: ['#FFC72C', '#FFBF00']
        },
        
        'starbucks': {
            name: 'Starbucks',
            primaryColor: '#00704A',
            secondaryColor: '#005A3A',
            textColor: '#FFFFFF',
            fontFamily: 'Freight Sans',
            materialFinish: 'glossy',
            gradientColors: ['#00704A', '#005A3A']
        },
        
        // Business & Professional
        'quickbooks': {
            name: 'QuickBooks',
            primaryColor: '#2CA01C',
            secondaryColor: '#228B16',
            textColor: '#FFFFFF',
            fontFamily: 'Custom Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#2CA01C', '#228B16']
        },
        
        'freshbooks': {
            name: 'FreshBooks',
            primaryColor: '#2C9AB7',
            secondaryColor: '#2485A0',
            textColor: '#FFFFFF',
            fontFamily: 'Open Sans',
            materialFinish: 'glossy',
            gradientColors: ['#2C9AB7', '#2485A0']
        },
        
        'square': {
            name: 'Square',
            primaryColor: '#FFFFFF',
            secondaryColor: '#3E4348',
            textColor: '#000000',
            fontFamily: 'Square Market',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        'stripe': {
            name: 'Stripe',
            primaryColor: '#635BFF',
            secondaryColor: '#5A51E6',
            textColor: '#FFFFFF',
            fontFamily: 'Stripe Sans',
            materialFinish: 'glossy',
            gradientColors: ['#635BFF', '#5A51E6']
        },
        
        'gusto': {
            name: 'Gusto',
            primaryColor: '#FF6F61',
            secondaryColor: '#E55A4F',
            textColor: '#FFFFFF',
            fontFamily: 'Rounded Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#FF6F61', '#E55A4F']
        },
        
        'clickup': {
            name: 'ClickUp',
            primaryColor: '#FFFFFF',
            secondaryColor: '#7B68EE',
            textColor: '#000000',
            fontFamily: 'Inter',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        'slack': {
            name: 'Slack',
            primaryColor: '#4A154B',
            secondaryColor: '#3D1142',
            textColor: '#FFFFFF',
            fontFamily: 'Slack Circular',
            materialFinish: 'glossy',
            gradientColors: ['#4A154B', '#3D1142']
        },
        
        'trello': {
            name: 'Trello',
            primaryColor: '#0079BF',
            secondaryColor: '#026AA7',
            textColor: '#FFFFFF',
            fontFamily: 'Roboto',
            materialFinish: 'glossy',
            gradientColors: ['#0079BF', '#026AA7']
        },
        
        'canva': {
            name: 'Canva',
            primaryColor: '#00C4CC',
            secondaryColor: '#00B3BA',
            textColor: '#FFFFFF',
            fontFamily: 'Canva Sans',
            materialFinish: 'glossy',
            gradientColors: ['#00C4CC', '#00B3BA']
        },
        
        'notion': {
            name: 'Notion',
            primaryColor: '#FFFFFF',
            secondaryColor: '#000000',
            textColor: '#000000',
            fontFamily: 'Inter',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        'zoom': {
            name: 'Zoom',
            primaryColor: '#2D8CFF',
            secondaryColor: '#1A7AE6',
            textColor: '#FFFFFF',
            fontFamily: 'Lato',
            materialFinish: 'glossy',
            gradientColors: ['#2D8CFF', '#1A7AE6']
        },
        
        'docusign': {
            name: 'DocuSign',
            primaryColor: '#0050A3',
            secondaryColor: '#004085',
            textColor: '#FFFFFF',
            fontFamily: 'Helvetica Neue',
            materialFinish: 'glossy',
            gradientColors: ['#0050A3', '#004085']
        },
        
        'dropbox': {
            name: 'Dropbox',
            primaryColor: '#0061FF',
            secondaryColor: '#0052D9',
            textColor: '#FFFFFF',
            fontFamily: 'Sharp Grotesk',
            materialFinish: 'glossy',
            gradientColors: ['#0061FF', '#0052D9']
        },
        
        'calendly': {
            name: 'Calendly',
            primaryColor: '#006BFF',
            secondaryColor: '#0057D9',
            textColor: '#FFFFFF',
            fontFamily: 'Inter',
            materialFinish: 'glossy',
            gradientColors: ['#006BFF', '#0057D9']
        },
        
        'wave': {
            name: 'Wave',
            primaryColor: '#3B9AB2',
            secondaryColor: '#2E7B8F',
            textColor: '#FFFFFF',
            fontFamily: 'Open Sans',
            materialFinish: 'glossy',
            gradientColors: ['#3B9AB2', '#2E7B8F']
        },
        
        // Health & Wellness
        'clue': {
            name: 'Clue',
            primaryColor: '#FF6B6B',
            secondaryColor: '#E55555',
            textColor: '#FFFFFF',
            fontFamily: 'Clean Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#FF6B6B', '#E55555']
        },
        
        'headspace': {
            name: 'Headspace',
            primaryColor: '#FF6B35',
            secondaryColor: '#E55A2B',
            textColor: '#FFFFFF',
            fontFamily: 'Rounded Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#FF6B35', '#E55A2B']
        },
        
        'nike training club': {
            name: 'Nike Training',
            primaryColor: '#000000',
            secondaryColor: '#FFFFFF',
            textColor: '#FFFFFF',
            fontFamily: 'Nike Font',
            materialFinish: 'glossy',
            gradientColors: ['#000000', '#333333']
        },
        
        // Photo & Media
        'vsco': {
            name: 'VSCO',
            primaryColor: '#FFFFFF',
            secondaryColor: '#CCCCCC',
            textColor: '#000000',
            fontFamily: 'VSCO Gothic',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        'flickr': {
            name: 'Flickr',
            primaryColor: '#FFFFFF',
            secondaryColor: '#0063DC',
            textColor: '#000000',
            fontFamily: 'Proxima Nova',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        'google photos': {
            name: 'Google Photos',
            primaryColor: '#FFFFFF',
            secondaryColor: '#4285F4',
            textColor: '#000000',
            fontFamily: 'Google Sans',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        'capcut': {
            name: 'CapCut',
            primaryColor: '#000000',
            secondaryColor: '#FFFFFF',
            textColor: '#FFFFFF',
            fontFamily: 'Custom Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#000000', '#333333']
        },
        
        'vimeo': {
            name: 'Vimeo',
            primaryColor: '#1AB7EA',
            secondaryColor: '#0E9CC7',
            textColor: '#FFFFFF',
            fontFamily: 'Gotham',
            materialFinish: 'glossy',
            gradientColors: ['#1AB7EA', '#0E9CC7']
        },
        
        'dailymotion': {
            name: 'Dailymotion',
            primaryColor: '#0066DC',
            secondaryColor: '#0052B3',
            textColor: '#FFFFFF',
            fontFamily: 'Arial',
            materialFinish: 'glossy',
            gradientColors: ['#0066DC', '#0052B3']
        },
        
        // Photo Printing
        'shutterfly': {
            name: 'Shutterfly',
            primaryColor: '#F05A28',
            secondaryColor: '#D64820',
            textColor: '#FFFFFF',
            fontFamily: 'Rounded Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#F05A28', '#D64820']
        },
        
        'snapfish': {
            name: 'Snapfish',
            primaryColor: '#0074C1',
            secondaryColor: '#0062A3',
            textColor: '#FFFFFF',
            fontFamily: 'Clean Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#0074C1', '#0062A3']
        },
        
        'walgreens photo': {
            name: 'Walgreens Photo',
            primaryColor: '#E31837',
            secondaryColor: '#C7142E',
            textColor: '#FFFFFF',
            fontFamily: 'Helvetica Neue',
            materialFinish: 'glossy',
            gradientColors: ['#E31837', '#C7142E']
        },
        
        'cvs photo': {
            name: 'CVS Photo',
            primaryColor: '#CC0000',
            secondaryColor: '#B30000',
            textColor: '#FFFFFF',
            fontFamily: 'Arial',
            materialFinish: 'glossy',
            gradientColors: ['#CC0000', '#B30000']
        },
        
        'walmart photo': {
            name: 'Walmart Photo',
            primaryColor: '#0071CE',
            secondaryColor: '#004C87',
            textColor: '#FFFFFF',
            fontFamily: 'Myriad Pro',
            materialFinish: 'glossy',
            gradientColors: ['#0071CE', '#004C87']
        },
        
        // Kids & Education
        'toca life world': {
            name: 'Toca Life World',
            primaryColor: '#FF6B9D',
            secondaryColor: '#E55A87',
            textColor: '#FFFFFF',
            fontFamily: 'Rounded Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#FF6B9D', '#E55A87']
        },
        
        'roblox': {
            name: 'Roblox',
            primaryColor: '#00A2FF',
            secondaryColor: '#0085D1',
            textColor: '#FFFFFF',
            fontFamily: 'Gotham',
            materialFinish: 'glossy',
            gradientColors: ['#00A2FF', '#0085D1']
        },
        
        'minecraft': {
            name: 'Minecraft',
            primaryColor: '#00AF54',
            secondaryColor: '#008F44',
            textColor: '#FFFFFF',
            fontFamily: 'Minecraft Font',
            materialFinish: 'glossy',
            gradientColors: ['#00AF54', '#008F44']
        },
        
        'duolingo': {
            name: 'Duolingo',
            primaryColor: '#58CC02',
            secondaryColor: '#4CAF00',
            textColor: '#FFFFFF',
            fontFamily: 'Rounded Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#58CC02', '#4CAF00']
        },
        
        'youtube kids': {
            name: 'YouTube Kids',
            primaryColor: '#FF0000',
            secondaryColor: '#CC0000',
            textColor: '#FFFFFF',
            fontFamily: 'Roboto',
            materialFinish: 'glossy',
            gradientColors: ['#FF0000', '#CC0000']
        },
        
        'messenger kids': {
            name: 'Messenger Kids',
            primaryColor: '#7B68EE',
            secondaryColor: '#00D632',
            textColor: '#FFFFFF',
            fontFamily: 'Helvetica Neue',
            materialFinish: 'glossy',
            gradientColors: ['#7B68EE', '#00D632']
        },
        
        // Additional Popular Apps
        'threads': {
            name: 'Threads',
            primaryColor: '#000000',
            secondaryColor: '#FFFFFF',
            textColor: '#FFFFFF',
            fontFamily: 'Instagram Sans',
            materialFinish: 'glossy',
            gradientColors: ['#000000', '#333333']
        },
        
        'pinterest': {
            name: 'Pinterest',
            primaryColor: '#FFFFFF',
            secondaryColor: '#E60023',
            textColor: '#000000',
            fontFamily: 'Helvetica Neue',
            materialFinish: 'glossy',
            gradientColors: ['#FFFFFF', '#F5F5F5']
        },
        
        'kik': {
            name: 'Kik',
            primaryColor: '#82BC23',
            secondaryColor: '#6FA01C',
            textColor: '#FFFFFF',
            fontFamily: 'Clean Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#82BC23', '#6FA01C']
        },
        
        'monarch money': {
            name: 'Monarch Money',
            primaryColor: '#1E3A8A',
            secondaryColor: '#FFD700',
            textColor: '#FFFFFF',
            fontFamily: 'Serif',
            materialFinish: 'glossy',
            gradientColors: ['#1E3A8A', '#1E40AF']
        },
        
        'todoist': {
            name: 'Todoist',
            primaryColor: '#E44332',
            secondaryColor: '#C7362A',
            textColor: '#FFFFFF',
            fontFamily: 'Clean Sans-Serif',
            materialFinish: 'glossy',
            gradientColors: ['#E44332', '#C7362A']
        },
        
        'lastpass': {
            name: 'LastPass',
            primaryColor: '#D32D27',
            secondaryColor: '#B8241F',
            textColor: '#FFFFFF',
            fontFamily: 'Tech Style',
            materialFinish: 'glossy',
            gradientColors: ['#D32D27', '#B8241F']
        },
        
        // Microsoft & Search
        'bing': {
            name: 'Bing',
            primaryColor: '#00BCF2',
            secondaryColor: '#0078D4',
            textColor: '#FFFFFF',
            fontFamily: 'Segoe UI',
            materialFinish: 'glossy',
            gradientColors: ['#00BCF2', '#0078D4']
        },
        
        'microsoft': {
            name: 'Microsoft',
            primaryColor: '#00BCF2',
            secondaryColor: '#0078D4',
            textColor: '#FFFFFF',
            fontFamily: 'Segoe UI',
            materialFinish: 'glossy',
            gradientColors: ['#00BCF2', '#0078D4']
        }
    };

    // ============================================================================
    // BRAND LOOKUP AND MATCHING
    // ============================================================================
    
    class BrandDatabase {
        constructor() {
            this.brands = BRAND_DATABASE;
            this.brandKeys = Object.keys(BRAND_DATABASE);
            console.log(`BrandDatabase initialized with ${this.brandKeys.length} brands`);
        }

        /**
         * Get brand data by exact name match
         * @param {string} brandName - Name of the brand/app
         * @returns {Object|null} - Brand data or null if not found
         */
        getBrandByName(brandName) {
            if (!brandName) return null;
            
            const searchKey = brandName.toLowerCase().trim();
            return this.brands[searchKey] || null;
        }

        /**
         * Get brand data with fuzzy matching for partial names
         * @param {string} brandName - Name of the brand/app
         * @returns {Object|null} - Best matching brand data
         */
        findBrandByPartialMatch(brandName) {
            if (!brandName) return null;
            
            const searchName = brandName.toLowerCase().trim();
            
            // Direct match first
            if (this.brands[searchName]) {
                return this.brands[searchName];
            }
            
            // Partial match - search for apps containing the search term
            for (const [key, brandData] of Object.entries(this.brands)) {
                if (searchName.includes(key) || key.includes(searchName)) {
                    return brandData;
                }
                
                // Also check against the display name
                if (brandData.name.toLowerCase().includes(searchName) || 
                    searchName.includes(brandData.name.toLowerCase())) {
                    return brandData;
                }
            }
            
            return null;
        }

        /**
         * Get all available brands
         * @returns {Array} - Array of brand names
         */
        getAllBrandNames() {
            return this.brandKeys.map(key => this.brands[key].name);
        }

        /**
         * Get brand count
         * @returns {number} - Number of brands in database
         */
        getBrandCount() {
            return this.brandKeys.length;
        }

        /**
         * Check if a brand exists
         * @param {string} brandName - Name to check
         * @returns {boolean} - True if brand exists
         */
        hasBrand(brandName) {
            return this.getBrandByName(brandName) !== null;
        }

        /**
         * Get default brand data for unknown apps
         * @returns {Object} - Default brand styling
         */
        getDefaultBrand() {
            return {
                name: 'Unknown App',
                primaryColor: '#4A90E2',
                secondaryColor: '#357ABD',
                textColor: '#FFFFFF',
                fontFamily: 'Arial',
                materialFinish: 'glossy',
                gradientColors: ['#4A90E2', '#357ABD']
            };
        }
    }

    // Export the class
    window.BrandDatabase = BrandDatabase;
    console.log("BrandDatabase module loaded successfully");
})();
