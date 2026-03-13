// ============================================================================
// HTML DEMO SVG ENGINE - EXACT COPY FROM svg_avatar_demo_v2BACKUP4.html
// ============================================================================

// CRITICAL: This is an EXACT copy of the HTML demo SVG generation logic
// DO NOT MODIFY until basic functionality works exactly like the demo

// Avatar configuration structure (copied exactly from HTML demo)
const defaultAvatarConfig = {
    gender: 'male',
    faceShape: 'oval',
    skinTone: '#FDBCB4',
    hairStyle: 'short',
    hairColor: '#8B4513',
    eyeShape: 'almond',
    eyeColor: '#4169E1',
    clothing: 'business',
    clothingStyle: 'pants',
    clothingColor: '#4169E1',
    sleeveStyle: 'short',
    accessories: [],
    beard: false,
    theme: '' // Empty means no theme
};

// Preset configurations (copied exactly from HTML demo)
const avatarPresets = {
    hawaiian: {
        gender: 'male',
        faceShape: 'round',
        skinTone: '#E0AC69',
        hairStyle: 'short',
        hairColor: '#8B4513',
        eyeShape: 'round',
        eyeColor: '#8B4513',
        clothing: 'casual',
        accessories: [],
        theme: 'hawaiian',
        beard: false
    },
    businessCasual: {
        gender: 'male',
        faceShape: 'square',
        skinTone: '#FDBCB4',
        hairStyle: 'medium',
        hairColor: '#8B4513',
        eyeShape: 'narrow',
        eyeColor: '#4169E1',
        clothing: 'business',
        accessories: [],
        theme: 'businessCasual',
        beard: true
    },
    fancyNight: {
        gender: 'male',
        faceShape: 'oval',
        skinTone: '#C68642',
        hairStyle: 'short',
        hairColor: '#000000',
        eyeShape: 'almond',
        eyeColor: '#228B22',
        clothing: 'formal',
        accessories: [],
        theme: 'fancyNight',
        beard: false
    },
    workout: {
        gender: 'female',
        faceShape: 'round',
        skinTone: '#FDBCB4',
        hairStyle: 'medium',
        hairColor: '#FFD700',
        eyeShape: 'round',
        eyeColor: '#4169E1',
        clothing: 'casual',
        accessories: [],
        theme: 'workout',
        beard: false
    },
    doctor: {
        gender: 'female',
        faceShape: 'oval',
        skinTone: '#E0AC69',
        hairStyle: 'short',
        hairColor: '#000000',
        eyeShape: 'almond',
        eyeColor: '#8B4513',
        clothing: 'medical',
        accessories: [],
        theme: 'doctor',
        beard: false
    },
    farmer: {
        gender: 'male',
        faceShape: 'square',
        skinTone: '#C68642',
        hairStyle: 'medium',
        hairColor: '#8B4513',
        eyeShape: 'narrow',
        eyeColor: '#228B22',
        clothing: 'casual',
        accessories: [],
        theme: 'farmer',
        beard: true
    },
    teacher: {
        gender: 'female',
        faceShape: 'oval',
        skinTone: '#FDBCB4',
        hairStyle: 'long',
        hairColor: '#B22222',
        eyeShape: 'round',
        eyeColor: '#228B22',
        clothing: 'casual',
        accessories: [],
        theme: 'teacher',
        beard: false
    }
};

// Generate SVG avatar with full body (EXACT COPY from HTML demo)
function generateAvatarSVG(config) {
    const faceShapes = {
        oval: { rx: 25, ry: 30, corners: false },
        round: { rx: 28, ry: 28, corners: false },
        square: { rx: 24, ry: 26, corners: true } // More rounded square
    };
    
    const hairStyles = {
        short: {
            male: 'M 25 20 Q 35 12 50 12 Q 65 12 75 20 Q 75 30 70 35 Q 60 25 50 25 Q 40 25 30 35 Q 25 30 25 20',
            female: 'M 22 18 Q 35 10 50 10 Q 65 10 78 18 Q 78 32 75 38 Q 60 28 50 28 Q 40 28 25 38 Q 22 32 22 18'
        },
        medium: {
            male: 'M 22 18 Q 35 8 50 8 Q 65 8 78 18 Q 78 35 75 40 Q 60 30 50 30 Q 40 30 25 40 Q 22 35 22 18',
            female: 'M 18 15 Q 35 5 50 5 Q 65 5 82 15 Q 82 38 78 45 Q 65 35 50 35 Q 35 35 22 45 Q 18 38 18 15'
        },
        long: {
            male: 'M 22 18 Q 35 8 50 8 Q 65 8 78 18 Q 80 28 78 38 Q 76 48 72 58 Q 68 68 65 78 Q 60 82 55 85 Q 50 87 45 85 Q 40 82 35 78 Q 32 68 28 58 Q 24 48 22 38 Q 20 28 22 18 M 15 25 Q 20 20 25 25 Q 30 35 25 40 Q 20 35 15 25 M 85 25 Q 80 20 75 25 Q 70 35 75 40 Q 80 35 85 25 M 25 78 Q 30 83 35 88 Q 40 85 45 88 Q 50 90 55 88 Q 60 85 65 88 Q 70 83 75 78',
            female: 'M 22 18 Q 35 8 50 8 Q 65 8 78 18 Q 80 28 78 38 Q 76 48 72 58 Q 68 68 65 78 Q 60 82 55 85 Q 50 87 45 85 Q 40 82 35 78 Q 32 68 28 58 Q 24 48 22 38 Q 20 28 22 18 M 15 25 Q 20 20 25 25 Q 30 35 25 40 Q 20 35 15 25 M 85 25 Q 80 20 75 25 Q 70 35 75 40 Q 80 35 85 25 M 25 78 Q 30 83 35 88 Q 40 85 45 88 Q 50 90 55 88 Q 60 85 65 88 Q 70 83 75 78'
        },
        bald: {
            male: '',
            female: ''
        }
    };
    
    const eyeShapes = {
        almond: { rx: 4, ry: 6 },
        round: { rx: 5, ry: 5 },
        narrow: { rx: 6, ry: 4 }
    };
    
    const face = faceShapes[config.faceShape] || faceShapes.oval; // Default to oval if invalid
    const hair = hairStyles[config.hairStyle] || hairStyles.short;
    const eyes = eyeShapes[config.eyeShape] || eyeShapes.almond;
    const gender = config.gender || 'male';
    
    let accessories = '';
    let clothing = '';
    let body = '';
    let hands = '';
    let eyelashes = '';
    let beard = '';
    
    // Add eyelashes for females
    if (gender === 'female') {
        eyelashes = `
            <!-- Eyelashes -->
            <path d="M 35 40 L 33 38 M 37 39 L 35 37 M 39 40 L 37 38" stroke="${config.hairColor}" stroke-width="0.8" fill="none"/>
            <path d="M 42 40 L 44 38 M 44 39 L 46 37 M 46 40 L 48 38" stroke="${config.hairColor}" stroke-width="0.8" fill="none"/>
            <path d="M 52 40 L 54 38 M 54 39 L 56 37 M 56 40 L 58 38" stroke="${config.hairColor}" stroke-width="0.8" fill="none"/>
            <path d="M 61 40 L 63 38 M 63 39 L 65 37 M 65 40 L 67 38" stroke="${config.hairColor}" stroke-width="0.8" fill="none"/>
        `;
    }
    
    // Add beard for males if enabled
    if (gender === 'male' && config.beard) {
        beard = `
            <!-- Beard -->
            <path d="M 35 63 Q 42 71 50 71 Q 58 71 65 63 Q 62 75 50 75 Q 38 75 35 63" fill="${config.hairColor}"/>
        `;
    }
    
    // Generate body parts
    const bodyWidth = gender === 'female' ? 0.75 : 1.0; // 25% thinner for females
    const armWidth = gender === 'female' ? 3.75 : 5; // 25% thinner for females
    const legWidth = gender === 'female' ? 4.5 : 6; // 25% thinner for females
    
    // Calculate actual coordinates for 25% difference
    const torsoWidthReduction = gender === 'female' ? 3.75 : 0; // 25% of 15 (half width)
    const pelvisWidthReduction = gender === 'female' ? 3 : 0; // 25% of 12 (half width)
    
    // Special handling for female fancy night dress or custom dress/skirt
    const isFemaleDeress = gender === 'female' && config.theme === 'fancyNight';
    const isCustomDress = config.clothingStyle === 'dress' && !config.theme;
    const isCustomSkirt = config.clothingStyle === 'skirt' && !config.theme;
    const isDressStyle = isFemaleDeress || isCustomDress;
    const isSkirtStyle = isCustomSkirt;
    
    body = `
        <!-- Neck -->
        <rect x="45" y="75" width="10" height="8" fill="${config.skinTone}"/>
        
        <!-- Body/Torso - gender-specific sizing -->
        ${isDressStyle ? 
            `<!-- Dress -->
             <path d="M ${35 + torsoWidthReduction} 83 L ${65 - torsoWidthReduction} 83 L ${68 - pelvisWidthReduction} 150 L ${32 + pelvisWidthReduction} 150 Z" fill="${isFemaleDeress ? '#000000' : getClothingColor(config)}"/>` :
            isSkirtStyle ?
            `<!-- Top and Skirt -->
             <path d="M ${35 + torsoWidthReduction} 83 L ${65 - torsoWidthReduction} 83 L ${68 - torsoWidthReduction} 118 L ${32 + torsoWidthReduction} 118 Z" fill="${getClothingColor(config)}"/>
             <path d="M ${38 + pelvisWidthReduction} 118 L ${62 - pelvisWidthReduction} 118 L ${66 - pelvisWidthReduction} 140 L ${34 + pelvisWidthReduction} 140 Z" fill="${getClothingColor(config)}"/>` :
            `<!-- Regular Top -->
             <path d="M ${35 + torsoWidthReduction} 83 L ${65 - torsoWidthReduction} 83 L ${68 - torsoWidthReduction} 118 L ${32 + torsoWidthReduction} 118 Z" fill="${getClothingColor(config)}"/>`
        }
        
        ${!isDressStyle && !isSkirtStyle ? `
        <!-- Pelvis/Shorts Area -->
        <rect x="${38 + pelvisWidthReduction}" y="118" width="${24 - pelvisWidthReduction*2}" height="12" rx="2" fill="${config.clothingStyle === 'shorts' ? getClothingColor(config) : getPantsColor(config)}"/>
        <!-- Leg openings in shorts -->
        <rect x="${40 + pelvisWidthReduction}" y="125" width="${6 - pelvisWidthReduction}" height="5" fill="${config.skinTone}"/>
        <rect x="${54 - pelvisWidthReduction}" y="125" width="${6 - pelvisWidthReduction}" height="5" fill="${config.skinTone}"/>
        ` : ''}
        
        <!-- Arms -->
        <ellipse cx="${gender === 'female' ? 32 : 29}" cy="100" rx="${armWidth}" ry="15" fill="${!config.theme && config.sleeveStyle === 'long' ? getClothingColor(config) : config.skinTone}"/>
        <ellipse cx="${gender === 'female' ? 68 : 71}" cy="100" rx="${armWidth}" ry="15" fill="${!config.theme && config.sleeveStyle === 'long' ? getClothingColor(config) : config.skinTone}"/>
        
        <!-- Hands -->
        <circle cx="${gender === 'female' ? 32 : 29}" cy="118" r="4" fill="${config.skinTone}"/>
        <circle cx="${gender === 'female' ? 68 : 71}" cy="118" r="4" fill="${config.skinTone}"/>
        
        <!-- Legs (starting from shorts) - use pants color for themed outfits, except shorts themes -->
        ${!isDressStyle && !isSkirtStyle ? `
        <ellipse cx="42" cy="${(config.theme === 'businessCasual' || config.theme === 'fancyNight' || config.theme === 'doctor' || config.theme === 'teacher' || config.theme === 'farmer') || (!config.theme && config.clothingStyle === 'pants') ? 140 : 145}" rx="${legWidth}" ry="${(config.theme === 'businessCasual' || config.theme === 'fancyNight' || config.theme === 'doctor' || config.theme === 'teacher' || config.theme === 'farmer') || (!config.theme && config.clothingStyle === 'pants') ? 20 : 15}" fill="${(config.theme && config.theme !== 'hawaiian' && config.theme !== 'workout') ? getPantsColor(config) : (config.clothingStyle === 'shorts' ? config.skinTone : (config.clothingStyle === 'pants' ? getClothingColor(config) : config.skinTone))}"/>
        <ellipse cx="58" cy="${(config.theme === 'businessCasual' || config.theme === 'fancyNight' || config.theme === 'doctor' || config.theme === 'teacher' || config.theme === 'farmer') || (!config.theme && config.clothingStyle === 'pants') ? 140 : 145}" rx="${legWidth}" ry="${(config.theme === 'businessCasual' || config.theme === 'fancyNight' || config.theme === 'doctor' || config.theme === 'teacher' || config.theme === 'farmer') || (!config.theme && config.clothingStyle === 'pants') ? 20 : 15}" fill="${(config.theme && config.theme !== 'hawaiian' && config.theme !== 'workout') ? getPantsColor(config) : (config.clothingStyle === 'shorts' ? config.skinTone : (config.clothingStyle === 'pants' ? getClothingColor(config) : config.skinTone))}"/>
        ` : isSkirtStyle ? `
        <!-- Legs showing from under skirt -->
        <ellipse cx="42" cy="155" rx="${legWidth}" ry="10" fill="${config.skinTone}"/>
        <ellipse cx="58" cy="155" rx="${legWidth}" ry="10" fill="${config.skinTone}"/>
        ` : `
        <!-- Legs showing from under dress -->
        <ellipse cx="42" cy="160" rx="${legWidth}" ry="8" fill="${config.skinTone}"/>
        <ellipse cx="58" cy="160" rx="${legWidth}" ry="8" fill="${config.skinTone}"/>
        `}
        
        <!-- Feet/Shoes -->
        <ellipse cx="42" cy="${isDressStyle ? 170 : isSkirtStyle ? 168 : 165}" rx="7" ry="4" fill="${getShoeColor(config)}"/>
        <ellipse cx="58" cy="${isDressStyle ? 170 : isSkirtStyle ? 168 : 165}" rx="7" ry="4" fill="${getShoeColor(config)}"/>
    `;
    
    // Generate clothing and accessories based on theme
    if (config.theme) {
        const themeData = getThemeData(config.theme, config);
        clothing = themeData.clothing;
        accessories = themeData.accessories;
        hands = themeData.hands;
    } else {
        // Standard accessories - check if accessories array exists
        if (config.accessories && config.accessories.includes('glasses')) {
            accessories += `
                <ellipse cx="40" cy="40" rx="6" ry="4" fill="none" stroke="#333" stroke-width="1.5"/>
                <ellipse cx="60" cy="40" rx="6" ry="4" fill="none" stroke="#333" stroke-width="1.5"/>
                <line x1="46" y1="40" x2="54" y2="40" stroke="#333" stroke-width="1.5"/>
            `;
        }
        
        if (config.accessories && config.accessories.includes('hat')) {
            accessories += `
                <ellipse cx="50" cy="20" rx="30" ry="8" fill="#4A4A4A"/>
                <ellipse cx="50" cy="15" rx="20" ry="10" fill="#4A4A4A"/>
            `;
        }
        
        if (config.accessories && config.accessories.includes('stethoscope')) {
            accessories += `
                <path d="M 25 85 Q 35 90 45 85 Q 50 88 55 85 Q 65 90 75 85" stroke="#C0C0C0" stroke-width="3" fill="none"/>
                <circle cx="25" cy="85" r="2" fill="#C0C0C0"/>
                <circle cx="75" cy="85" r="2" fill="#C0C0C0"/>
                <ellipse cx="50" cy="95" rx="6" ry="4" fill="#C0C0C0"/>
            `;
        }
    }
    
    // Face shape rendering (moved down to close gap with neck)
    let faceElement;
    if (face.corners) {
        // More rounded square face
        faceElement = `<rect x="${50 - face.rx}" y="${48 - face.ry}" width="${face.rx * 2}" height="${face.ry * 2}" rx="12" fill="url(#faceGrad)"/>`;
    } else {
        faceElement = `<ellipse cx="50" cy="48" rx="${face.rx}" ry="${face.ry}" fill="url(#faceGrad)"/>`;
    }
    
    return `
        <svg width="100" height="160" viewBox="0 0 100 160">
            <defs>
                <radialGradient id="faceGrad" cx="50%" cy="30%" r="70%">
                    <stop offset="0%" style="stop-color:${config.skinTone};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${adjustColor(config.skinTone, -20)};stop-opacity:1" />
                </radialGradient>
                <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${adjustColor(config.hairColor, 20)};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${config.hairColor};stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Hair (behind everything) -->
            ${hair && hair[gender] ? `<path d="${hair[gender]}" fill="url(#hairGrad)"/>` : ''}
            
            <!-- Body (drawn after hair, behind clothing) -->
            ${body}
            
            <!-- Theme-specific clothing -->
            ${clothing}
            
            <!-- Face -->
            ${faceElement}
            
            <!-- Eyes -->
            <ellipse cx="40" cy="43" rx="${eyes.rx}" ry="${eyes.ry}" fill="#fff"/>
            <ellipse cx="60" cy="43" rx="${eyes.rx}" ry="${eyes.ry}" fill="#fff"/>
            <circle cx="40" cy="43" r="2.5" fill="${config.eyeColor}"/>
            <circle cx="60" cy="43" r="2.5" fill="${config.eyeColor}"/>
            <circle cx="41" cy="42" r="1" fill="#fff"/>
            <circle cx="61" cy="42" r="1" fill="#fff"/>
            
            <!-- Eyelashes (for females) -->
            ${eyelashes}
            
            <!-- Eyebrows -->
            <path d="M 35 38 Q 40 36 45 38" stroke="${config.hairColor}" stroke-width="1.5" fill="none"/>
            <path d="M 55 38 Q 60 36 65 38" stroke="${config.hairColor}" stroke-width="1.5" fill="none"/>
            
            <!-- Nose -->
            <path d="M 48 48 Q 50 51 52 48" stroke="${adjustColor(config.skinTone, -30)}" stroke-width="1" fill="none"/>
            
            <!-- Mouth -->
            <path d="M 45 58 Q 50 63 55 58" stroke="#D2691E" stroke-width="1.5" fill="none"/>
            
            <!-- Beard (for males if enabled) -->
            ${beard}
            
            <!-- Hands holding items -->
            ${hands}
            
            <!-- Accessories (drawn last, on top) -->
            ${accessories}
        </svg>
    `;
}

// Utility function to adjust color brightness (EXACT COPY from HTML demo)
function adjustColor(color, amount) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Helper functions for clothing colors (EXACT COPY from HTML demo)
function getClothingColor(config) {
    if (config.theme) return '#FFFFFF'; // Will be overridden by theme
    return config.clothingColor || '#4169E1';
}

function getSleeveColor(config) {
    if (config.theme) return '#FFFFFF'; // Will be overridden by theme
    return getClothingColor(config);
}

function getPantsColor(config) {
    if (config.theme) {
        const themeData = getThemeData(config.theme, config);
        return themeData.pants || '#2C3E50';
    }
    const colors = {
        business: '#1C3B47',
        medical: '#2C3E50',
        casual: '#000080',
        formal: '#000000'
    };
    return colors[config.clothing] || '#2C3E50';
}

function getShoeColor(config) {
    if (config.theme) {
        const themeData = getThemeData(config.theme, config);
        return themeData.shoes || '#000000';
    }
    return '#000000';
}

// Theme data generator (EXACT COPY from HTML demo)
function getThemeData(theme, config) {
    const themes = {
        hawaiian: {
            clothing: `
                <!-- Flowered Hawaiian Shirt -->
                <path d="M 35 83 L 65 83 L 68 118 L 32 118 Z" fill="#FF6B6B"/>
                <circle cx="42" cy="90" r="2" fill="#FFD93D"/>
                <circle cx="52" cy="95" r="2" fill="#6BCF7F"/>
                <circle cx="58" cy="88" r="2" fill="#FF6B6B"/>
                <circle cx="45" cy="105" r="2" fill="#4ECDC4"/>
                <circle cx="55" cy="110" r="2" fill="#FFD93D"/>
            `,
            pants: '#87CEEB', // Light blue shorts
            shoes: '#8B4513', // Brown flip flops
            accessories: `
                <!-- Sunglasses -->
                <ellipse cx="40" cy="43" rx="6" ry="4" fill="#333"/>
                <ellipse cx="60" cy="43" rx="6" ry="4" fill="#333"/>
                <line x1="46" y1="43" x2="54" y2="43" stroke="#333" stroke-width="2"/>
                
                <!-- Fedora Hat -->
                <ellipse cx="50" cy="21" rx="28" ry="6" fill="#D2B48C"/>
                <ellipse cx="50" cy="15" rx="18" ry="8" fill="#D2B48C"/>
                
                <!-- Pink Lei -->
                <path d="M 25 85 Q 35 82 45 85 Q 55 82 65 85 Q 75 82 85 85" stroke="#FF69B4" stroke-width="4" fill="none"/>
                <circle cx="30" cy="84" r="2" fill="#FF1493"/>
                <circle cx="40" cy="83" r="2" fill="#FF69B4"/>
                <circle cx="50" cy="83" r="2" fill="#FF1493"/>
                <circle cx="60" cy="83" r="2" fill="#FF69B4"/>
                <circle cx="70" cy="84" r="2" fill="#FF1493"/>
                
                <!-- Flip flop straps -->
                <line x1="42" y1="162" x2="42" y2="165" stroke="#333" stroke-width="1"/>
                <line x1="58" y1="162" x2="58" y2="165" stroke="#333" stroke-width="1"/>
            `,
            hands: `
                <!-- Full-size Surfboard - as tall as avatar, much wider -->
                <ellipse cx="8" cy="125" rx="12" ry="80" fill="#4ECDC4"/>
                <ellipse cx="8" cy="105" rx="10" ry="20" fill="#FFD93D"/>
                <ellipse cx="8" cy="145" rx="10" ry="20" fill="#FF6B6B"/>
                <!-- Hand holding surfboard -->
                <circle cx="20" cy="118" r="3" fill="${config ? config.skinTone : '#FFDBAC'}"/>
            `
        },
        businessCasual: {
            clothing: `
                <!-- Blue Button Down Shirt -->
                <path d="M 35 83 L 65 83 L 68 118 L 32 118 Z" fill="#4169E1"/>
                <line x1="50" y1="83" x2="50" y2="118" stroke="#2F4F4F" stroke-width="1"/>
                <circle cx="50" cy="90" r="1" fill="#FFFFFF"/>
                <circle cx="50" cy="100" r="1" fill="#FFFFFF"/>
                <circle cx="50" cy="110" r="1" fill="#FFFFFF"/>
            `,
            pants: '#F0E68C', // Khaki pants
            shoes: '#000000', // Black shoes
            accessories: ``,
            hands: `
                <!-- Phone in left hand - 2x larger -->
                <rect x="22" y="110" width="8" height="16" rx="2" fill="#000000"/>
                <rect x="23" y="111" width="6" height="14" fill="#4169E1"/>
                
                <!-- Briefcase in right hand - 3x larger and lower -->
                <rect x="60" y="125" width="24" height="18" rx="3" fill="#8B4513"/>
                <line x1="62" y1="125" x2="82" y2="125" stroke="#000" stroke-width="1.5"/>
                <circle cx="72" cy="134" r="1.5" fill="#FFD700"/>
                <rect x="69" y="120" width="6" height="5" fill="#8B4513"/>
                <line x1="70" y1="122" x2="74" y2="122" stroke="#654321" stroke-width="1"/>
            `
        },
        fancyNight: {
            clothing: `
                <!-- Black Suit/Dress - handled in body generation -->
                ${!config || config.gender !== 'female' ? `
                <path d="M 35 83 L 65 83 L 68 118 L 32 118 Z" fill="#000000"/>
                <path d="M 38 86 L 62 86 L 65 115 L 35 115 Z" fill="#FFFFFF"/>
                <rect x="48" y="85" width="4" height="30" fill="#000000"/>
                ` : ''}
            `,
            pants: '#000000', // Black pants
            shoes: '#000000', // Black shoes
            accessories: `
                ${!config || config.gender !== 'female' ? `
                <!-- Top Hat (male only) -->
                <rect x="40" y="5" width="20" height="15" rx="2" fill="#000000"/>
                <ellipse cx="50" cy="20" rx="25" ry="4" fill="#000000"/>
                
                <!-- Bow Tie (male only) - proper bowtie shape -->
                <path d="M 42 75 L 48 77 L 52 77 L 58 75 L 52 73 L 48 73 Z" fill="#FFFFFF"/>
                <rect x="48.5" y="73.5" width="3" height="3.5" fill="#000000"/>
                <path d="M 42 75 Q 44 73 46 75 Q 44 77 42 75" fill="#FFFFFF"/>
                <path d="M 58 75 Q 56 73 54 75 Q 56 77 58 75" fill="#FFFFFF"/>
                ` : ''}
            `,
            hands: `
                ${config && config.gender === 'female' ? `
                <!-- Black Purse for female -->
                <rect x="68" y="115" width="8" height="6" rx="2" fill="#000000"/>
                <path d="M 70 115 Q 72 112 74 115" stroke="#000000" stroke-width="1" fill="none"/>
                <circle cx="75" cy="118" r="0.5" fill="#FFD700"/>
                ` : ''}
            `
        },
        workout: {
            clothing: `
                <!-- Gray Tank Top -->
                <path d="M 40 83 L 60 83 L 62 118 L 38 118 Z" fill="#808080"/>
            `,
            pants: '#0000FF', // Blue shorts
            shoes: '#FFFFFF', // White shoes
            accessories: `
                <!-- Headband - extends to edges of head -->
                <rect x="22" y="28" width="56" height="4" rx="2" fill="#FF0000"/>
                
                <!-- White Socks -->
                <rect x="40" y="150" width="4" height="10" fill="#FFFFFF"/>
                <rect x="56" y="150" width="4" height="10" fill="#FFFFFF"/>
                
                <!-- Shoe details -->
                <ellipse cx="42" cy="165" rx="5" ry="3" fill="#E0E0E0"/>
                <ellipse cx="58" cy="165" rx="5" ry="3" fill="#E0E0E0"/>
            `,
            hands: `
                <!-- Water Bottle - 2x larger -->
                <rect x="66" y="105" width="8" height="24" rx="4" fill="#87CEEB"/>
                <rect x="68" y="101" width="4" height="4" fill="#4169E1"/>
                <!-- Bottle cap -->
                <rect x="69" y="99" width="2" height="2" fill="#000000"/>
            `
        },
        doctor: {
            clothing: `
                <!-- White Lab Coat -->
                <path d="M 32 83 L 68 83 L 70 118 L 30 118 Z" fill="#FFFFFF"/>
                <path d="M 32 83 L 68 83 L 70 118 L 30 118 Z" fill="none" stroke="#E0E0E0" stroke-width="1"/>
                <line x1="50" y1="83" x2="50" y2="118" stroke="#E0E0E0" stroke-width="1"/>
            `,
            pants: '#2F4F4F', // Dark pants
            shoes: '#8B4513', // Brown shoes
            accessories: `
                <!-- Stethoscope -->
                <path d="M 25 85 Q 35 90 45 85 Q 50 88 55 85 Q 65 90 75 85" stroke="#C0C0C0" stroke-width="3" fill="none"/>
                <circle cx="25" cy="85" r="2" fill="#C0C0C0"/>
                <circle cx="75" cy="85" r="2" fill="#C0C0C0"/>
                <ellipse cx="50" cy="95" rx="6" ry="4" fill="#C0C0C0"/>
            `,
            hands: `
                <!-- Clipboard - 3x larger -->
                <rect x="65" y="100" width="18" height="30" fill="#D2B48C"/>
                <rect x="67" y="102" width="14" height="26" fill="#FFFFFF"/>
                <line x1="69" y1="106" x2="79" y2="106" stroke="#000" stroke-width="0.8"/>
                <line x1="69" y1="110" x2="79" y2="110" stroke="#000" stroke-width="0.8"/>
                <line x1="69" y1="114" x2="79" y2="114" stroke="#000" stroke-width="0.8"/>
                <line x1="69" y1="118" x2="79" y2="118" stroke="#000" stroke-width="0.8"/>
                <line x1="69" y1="122" x2="79" y2="122" stroke="#000" stroke-width="0.8"/>
                <!-- Clipboard clip -->
                <rect x="72" y="98" width="4" height="4" rx="1" fill="#C0C0C0"/>
            `
        },
        farmer: {
            clothing: `
                <!-- Blue Overalls -->
                <path d="M 35 83 L 65 83 L 68 118 L 32 118 Z" fill="#4169E1"/>
                <rect x="42" y="85" width="4" height="15" fill="#4169E1"/>
                <rect x="54" y="85" width="4" height="15" fill="#4169E1"/>
                <circle cx="44" cy="92" r="1" fill="#FFD700"/>
                <circle cx="56" cy="92" r="1" fill="#FFD700"/>
            `,
            pants: '#4169E1', // Blue pants (matching overalls)
            shoes: '#8B4513', // Brown boots (larger)
            accessories: `
                <!-- Straw Hat -->
                <ellipse cx="50" cy="18" rx="32" ry="8" fill="#DEB887"/>
                <ellipse cx="50" cy="12" rx="18" ry="8" fill="#DEB887"/>
                
                <!-- Boot details -->
                <ellipse cx="42" cy="165" rx="8" ry="5" fill="#654321"/>
                <ellipse cx="58" cy="165" rx="8" ry="5" fill="#654321"/>
            `,
            hands: `
                <!-- Pitchfork - as tall as surfboard with larger tines -->
                <line x1="15" y1="50" x2="15" y2="150" stroke="#8B4513" stroke-width="2"/>
                <!-- 3x larger tines at the top -->
                <line x1="9" y1="50" x2="9" y2="74" stroke="#C0C0C0" stroke-width="2"/>
                <line x1="15" y1="50" x2="15" y2="74" stroke="#C0C0C0" stroke-width="2"/>
                <line x1="21" y1="50" x2="21" y2="74" stroke="#C0C0C0" stroke-width="2"/>
                <!-- Cross piece connecting tines -->
                <line x1="9" y1="74" x2="21" y2="74" stroke="#8B4513" stroke-width="1"/>
            `
        },
        teacher: {
            clothing: `
                <!-- White Long Sleeve Shirt -->
                <path d="M 35 83 L 65 83 L 68 118 L 32 118 Z" fill="#FFFFFF"/>
            `,
            pants: '#000080', // Dark blue pants
            shoes: '#000000', // Black shoes
            accessories: ``,
            hands: `
                <!-- Red Apple in left hand - reduced size -->
                <circle cx="20" cy="115" r="6" fill="#FF0000"/>
                <path d="M 20 109 Q 22 107 24 109" stroke="#228B22" stroke-width="2" fill="none"/>
                <ellipse cx="21" cy="111" rx="1.5" ry="0.8" fill="#FF6B6B"/>
                
                <!-- Yellow Pencil in right hand - 4x larger -->
                <line x1="75" y1="105" x2="75" y2="135" stroke="#FFD700" stroke-width="6"/>
                <polygon points="75,105 70,100 80,100" fill="#FFB6C1"/>
                <rect x="73" y="130" width="4" height="8" fill="#C0C0C0"/>
            `
        }
    };
    
    return themes[theme] || { clothing: '', accessories: '', hands: '' };
}

// CRITICAL: Missing functions that were referenced in SVG generation but not defined
function getClothingColor(config) {
    // Use the clothingColor from config if available, otherwise default to blue
    return config.clothingColor || '#4169E1';
}

function getPantsColor(config) {
    // For pants, use clothingColor as well, but could have different logic
    return config.clothingColor || '#4169E1';
}

function getShoeColor(config) {
    // Default shoe color - could be made configurable later
    return '#000000'; // Black shoes
}

console.log('✅ HTML Demo SVG Engine loaded - EXACT COPY from demo');
