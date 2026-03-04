/**
 * AVATAR STYLES CONFIGURATION
 * Defines all appearance options and their properties for contact avatars
 */

// Hair styles and colors
const HAIR_STYLES = {
    bald: {
        name: 'Bald',
        geometry: null // No hair geometry
    },
    short: {
        name: 'Short Hair',
        geometry: 'sphere',
        scale: { x: 1.0, y: 0.4, z: 1.0 },
        position: { x: 0, y: 0.1, z: 0 }
    },
    long: {
        name: 'Long Hair',
        geometry: 'sphere',
        scale: { x: 1.3, y: 1.2, z: 1.4 },
        position: { x: 0, y: 0.15, z: -0.1 }
    }
};

const HAIR_COLORS = {
    blonde: { name: 'Blonde', color: 0xF5DEB3 },
    red: { name: 'Red', color: 0xCD853F },
    brown: { name: 'Brown', color: 0x8B4513 },
    black: { name: 'Black', color: 0x2F2F2F }
};

// Skin tones
const SKIN_TONES = {
    light: { name: 'Light', color: 0xFFDBAC },
    medium: { name: 'Medium', color: 0xDEB887 },
    dark: { name: 'Dark', color: 0x8B4513 }
};

// Age categories (affects head and body proportions)
const AGE_CATEGORIES = {
    teen: {
        name: 'Teen',
        headScale: 1.1,
        bodyScale: 0.9,
        height: 0.9
    },
    youngAdult: {
        name: 'Young Adult',
        headScale: 1.0,
        bodyScale: 1.0,
        height: 1.0
    },
    olderAdult: {
        name: 'Older Adult',
        headScale: 0.95,
        bodyScale: 1.1,
        height: 0.95
    }
};

// Gender styles (affects body shape and clothing options)
const GENDER_STYLES = {
    male: {
        name: 'Male',
        bodyGeometry: 'cylinder',
        shoulderWidth: 1.0,
        hipWidth: 0.8
    },
    female: {
        name: 'Female',
        bodyGeometry: 'cylinder',
        shoulderWidth: 0.8,
        hipWidth: 1.0
    },
    other: {
        name: 'Other',
        bodyGeometry: 'cylinder',
        shoulderWidth: 0.9,
        hipWidth: 0.9
    }
};

// Clothing themes
const CLOTHING_THEMES = {
    businessCasual: {
        name: 'Business Casual',
        shirt: { color: 0xFFFFFF, type: 'collared' },
        pants: { color: 0x2F4F4F, type: 'slacks' },
        accessories: ['belt']
    },
    fancyNight: {
        name: 'Fancy Night Out',
        male: {
            shirt: { color: 0x000000, type: 'tuxedo' },
            pants: { color: 0x000000, type: 'formal' },
            accessories: ['bowtie']
        },
        female: {
            dress: { color: 0x000000, type: 'elegant' },
            accessories: ['earrings']
        }
    },
    workout: {
        name: 'Workout Gear',
        shirt: { color: 0x1E90FF, type: 'tank' },
        pants: { color: 0x2F2F2F, type: 'athletic' },
        accessories: ['sneakers']
    },
    hawaiian: {
        name: 'Hawaiian Vacation',
        shirt: { color: 0xFF6347, type: 'hawaiian', pattern: 'floral' },
        pants: { color: 0xF0E68C, type: 'shorts' },
        accessories: ['sandals']
    },
    farmer: {
        name: 'Farmer',
        shirt: { color: 0x228B22, type: 'work' },
        pants: { color: 0x4169E1, type: 'overalls' },
        accessories: ['hat_straw', 'boots']
    },
    doctor: {
        name: 'Doctor',
        shirt: { color: 0xFFFFFF, type: 'scrubs' },
        pants: { color: 0xFFFFFF, type: 'scrubs' },
        accessories: ['stethoscope']
    },
    teacher: {
        name: 'Teacher',
        shirt: { color: 0xF0F8FF, type: 'blouse' },
        pants: { color: 0x708090, type: 'professional' },
        accessories: ['glasses']
    }
};

// Default avatar configuration
const DEFAULT_AVATAR = {
    hair: 'short',
    hairColor: 'brown',
    skinTone: 'medium',
    age: 'youngAdult',
    gender: 'other',
    clothing: 'businessCasual'
};

// Export all configurations
window.AvatarStyles = {
    HAIR_STYLES,
    HAIR_COLORS,
    SKIN_TONES,
    AGE_CATEGORIES,
    GENDER_STYLES,
    CLOTHING_THEMES,
    DEFAULT_AVATAR
};

console.log('👤 Avatar Styles configuration loaded');
