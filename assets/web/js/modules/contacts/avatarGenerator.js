/**
 * AVATAR GENERATOR
 * Creates customizable 3D avatars for contact objects using modular SVG-style components
 */

class AvatarGenerator {
    constructor() {
        this.cache = new Map(); // Cache generated avatars for performance
    }

    /**
     * Generate a complete avatar based on customization options
     * @param {Object} options - Avatar customization options
     * @returns {THREE.Group} - Complete avatar group
     */
    generateAvatar(options = {}) {
        // Use default options if not provided
        const config = { ...window.AvatarStyles.DEFAULT_AVATAR, ...options };
        
        // Check cache first
        const cacheKey = this.getCacheKey(config);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey).clone();
        }

        console.log('👤 Generating avatar with config:', config);

        // Create avatar group
        const avatar = new THREE.Group();
        avatar.name = 'ContactAvatar';
        avatar.userData = { config, isContactAvatar: true };

        // Get style configurations
        const skinTone = window.AvatarStyles.SKIN_TONES[config.skinTone];
        const ageCategory = window.AvatarStyles.AGE_CATEGORIES[config.age];
        const genderStyle = window.AvatarStyles.GENDER_STYLES[config.gender];
        const clothingTheme = window.AvatarStyles.CLOTHING_THEMES[config.clothing];

        // Apply age-based scaling
        avatar.scale.multiplyScalar(ageCategory.height);

        // Create avatar components
        this.createHead(avatar, config, skinTone, ageCategory);
        this.createHair(avatar, config, ageCategory);
        this.createBody(avatar, config, skinTone, genderStyle, ageCategory);
        this.createArms(avatar, skinTone);
        this.createLegs(avatar, config, genderStyle, clothingTheme);
        this.createClothing(avatar, config, genderStyle, clothingTheme);
        this.createAccessories(avatar, config, clothingTheme);

        // Cache the generated avatar
        this.cache.set(cacheKey, avatar.clone());

        return avatar;
    }

    /**
     * Create head with facial features
     */
    createHead(avatar, config, skinTone, ageCategory) {
        const headScale = ageCategory.headScale;
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.18 * headScale, 12, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ color: skinTone.color });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.85, 0);
        head.name = 'head';
        avatar.add(head);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.025, 6, 4);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.06, 0.88, 0.14);
        leftEye.name = 'leftEye';
        avatar.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.06, 0.88, 0.14);
        rightEye.name = 'rightEye';
        avatar.add(rightEye);

        // Simple nose (small sphere)
        const noseGeometry = new THREE.SphereGeometry(0.015, 6, 4);
        const nose = new THREE.Mesh(noseGeometry, headMaterial);
        nose.position.set(0, 0.85, 0.16);
        nose.name = 'nose';
        avatar.add(nose);
    }

    /**
     * Create hair based on style and color
     */
    createHair(avatar, config, ageCategory) {
        const hairStyle = window.AvatarStyles.HAIR_STYLES[config.hair];
        const hairColor = window.AvatarStyles.HAIR_COLORS[config.hairColor];
        
        if (!hairStyle || !hairStyle.geometry) {
            return; // Bald or no hair
        }

        const hairMaterial = new THREE.MeshLambertMaterial({ color: hairColor.color });
        
        if (config.hair === 'long') {
            // Create long hair as short hair + back panel
            const hairGroup = new THREE.Group();
            hairGroup.name = 'hair';
            
            // Main hair (same as short hair)
            const mainHairGeometry = new THREE.SphereGeometry(0.19, 12, 8);
            const mainHair = new THREE.Mesh(mainHairGeometry, hairMaterial);
            mainHair.scale.set(1.0, 0.4, 1.0); // Same as short hair
            mainHair.position.set(0, 0.85 + 0.1, 0); // Same as short hair
            hairGroup.add(mainHair);
            
            // Additional thin back panel for shoulder-length hair
            const backPanelGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.05);
            const backPanel = new THREE.Mesh(backPanelGeometry, hairMaterial);
            backPanel.position.set(0, 0.65, -0.18); // Behind the head, extending down
            backPanel.rotation.x = 0.1; // Slight curve
            hairGroup.add(backPanel);
            
            avatar.add(hairGroup);
        } else {
            // Regular hair styles (short, etc.)
            let hairGeometry;
            switch (hairStyle.geometry) {
                case 'sphere':
                    hairGeometry = new THREE.SphereGeometry(0.19, 12, 8);
                    break;
                default:
                    hairGeometry = new THREE.SphereGeometry(0.19, 12, 8);
            }

            const hair = new THREE.Mesh(hairGeometry, hairMaterial);
            
            // Apply hair style scaling and positioning
            hair.scale.set(
                hairStyle.scale.x,
                hairStyle.scale.y,
                hairStyle.scale.z
            );
            hair.position.set(
                hairStyle.position.x,
                0.85 + hairStyle.position.y,
                hairStyle.position.z
            );
            
            hair.name = 'hair';
            avatar.add(hair);
        }
    }

    /**
     * Create body/torso
     */
    createBody(avatar, config, skinTone, genderStyle, ageCategory) {
        const bodyGeometry = new THREE.CylinderGeometry(
            0.22 * genderStyle.shoulderWidth * ageCategory.bodyScale,
            0.28 * genderStyle.hipWidth * ageCategory.bodyScale,
            0.7,
            8
        );
        
        // Use skin color for now, clothing will be added separately
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: skinTone.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0.35, 0);
        body.name = 'body';
        avatar.add(body);
    }

    /**
     * Create arms
     */
    createArms(avatar, skinTone) {
        const armGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.55, 6);
        const armMaterial = new THREE.MeshLambertMaterial({ color: skinTone.color });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.35, 0.3, 0);
        leftArm.rotation.z = 0.15;
        leftArm.name = 'leftArm';
        avatar.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.35, 0.3, 0);
        rightArm.rotation.z = -0.15;
        rightArm.name = 'rightArm';
        avatar.add(rightArm);
    }

    /**
     * Create legs
     */
    createLegs(avatar, config, genderStyle, clothingTheme) {
        const legGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6);
        
        // Determine leg color based on clothing
        let legColor = 0x4169E1; // Default blue
        if (clothingTheme.pants) {
            legColor = clothingTheme.pants.color;
        } else if (clothingTheme.dress) {
            // For dresses, legs might be skin-colored or covered
            const skinTone = window.AvatarStyles.SKIN_TONES[config.skinTone];
            legColor = skinTone.color;
        }
        
        const legMaterial = new THREE.MeshLambertMaterial({ color: legColor });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.12, -0.3, 0);
        leftLeg.name = 'leftLeg';
        avatar.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.12, -0.3, 0);
        rightLeg.name = 'rightLeg';
        avatar.add(rightLeg);
    }

    /**
     * Create clothing based on theme
     */
    createClothing(avatar, config, genderStyle, clothingTheme) {
        // Create shirt/top
        if (clothingTheme.shirt) {
            this.createShirt(avatar, clothingTheme.shirt);
        } else if (clothingTheme.dress && config.gender === 'female') {
            this.createDress(avatar, clothingTheme.dress);
        } else if (clothingTheme.male && config.gender === 'male') {
            this.createShirt(avatar, clothingTheme.male.shirt);
        } else if (clothingTheme.female && config.gender === 'female') {
            if (clothingTheme.female.dress) {
                this.createDress(avatar, clothingTheme.female.dress);
            } else if (clothingTheme.female.shirt) {
                this.createShirt(avatar, clothingTheme.female.shirt);
            }
        }
    }

    /**
     * Create shirt/top clothing
     */
    createShirt(avatar, shirtConfig) {
        const shirtGeometry = new THREE.CylinderGeometry(0.24, 0.3, 0.65, 8);
        const shirtMaterial = new THREE.MeshLambertMaterial({ color: shirtConfig.color });
        const shirt = new THREE.Mesh(shirtGeometry, shirtMaterial);
        shirt.position.set(0, 0.35, 0);
        shirt.name = 'shirt';
        avatar.add(shirt);
    }

    /**
     * Create dress
     */
    createDress(avatar, dressConfig) {
        const dressGeometry = new THREE.CylinderGeometry(0.24, 0.4, 0.9, 8);
        const dressMaterial = new THREE.MeshLambertMaterial({ color: dressConfig.color });
        const dress = new THREE.Mesh(dressGeometry, dressMaterial);
        dress.position.set(0, 0.25, 0);
        dress.name = 'dress';
        avatar.add(dress);
    }

    /**
     * Create accessories based on clothing theme
     */
    createAccessories(avatar, config, clothingTheme) {
        if (!clothingTheme.accessories) return;

        clothingTheme.accessories.forEach(accessory => {
            switch (accessory) {
                case 'hat_straw':
                    this.createStrawHat(avatar);
                    break;
                case 'bowtie':
                    this.createBowtie(avatar);
                    break;
                case 'glasses':
                    this.createGlasses(avatar);
                    break;
                case 'stethoscope':
                    this.createStethoscope(avatar);
                    break;
                // Add more accessories as needed
            }
        });
    }

    /**
     * Create straw hat accessory
     */
    createStrawHat(avatar) {
        const hatColor = 0xDAA520; // Golden straw
        
        // Hat crown
        const hatGeometry = new THREE.CylinderGeometry(0.2, 0.18, 0.08, 8);
        const hatMaterial = new THREE.MeshLambertMaterial({ color: hatColor });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.set(0, 0.98, 0);
        hat.name = 'hat';
        avatar.add(hat);
        
        // Hat brim
        const brimGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.015, 16);
        const brim = new THREE.Mesh(brimGeometry, hatMaterial);
        brim.position.set(0, 0.94, 0);
        brim.name = 'hatBrim';
        avatar.add(brim);
    }

    /**
     * Create bowtie accessory
     */
    createBowtie(avatar) {
        const bowtieGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.08);
        const bowtieMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const bowtie = new THREE.Mesh(bowtieGeometry, bowtieMaterial);
        bowtie.position.set(0, 0.65, 0.22);
        bowtie.name = 'bowtie';
        avatar.add(bowtie);
    }

    /**
     * Create glasses accessory
     */
    createGlasses(avatar) {
        const glassesGroup = new THREE.Group();
        glassesGroup.name = 'glasses';
        
        // Frame
        const frameGeometry = new THREE.TorusGeometry(0.08, 0.01, 8, 16);
        const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
        
        const leftLens = new THREE.Mesh(frameGeometry, frameMaterial);
        leftLens.position.set(-0.06, 0.88, 0.14);
        glassesGroup.add(leftLens);
        
        const rightLens = new THREE.Mesh(frameGeometry, frameMaterial);
        rightLens.position.set(0.06, 0.88, 0.14);
        glassesGroup.add(rightLens);
        
        avatar.add(glassesGroup);
    }

    /**
     * Create stethoscope accessory
     */
    createStethoscope(avatar) {
        const stethoscopeGroup = new THREE.Group();
        stethoscopeGroup.name = 'stethoscope';
        
        // Stethoscope tube (simplified)
        const tubeGeometry = new THREE.TorusGeometry(0.15, 0.01, 8, 16);
        const tubeMaterial = new THREE.MeshBasicMaterial({ color: 0x2F2F2F });
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tube.position.set(0, 0.5, 0.2);
        tube.rotation.x = Math.PI / 2;
        stethoscopeGroup.add(tube);
        
        avatar.add(stethoscopeGroup);
    }

    /**
     * Generate cache key for avatar configuration
     */
    getCacheKey(config) {
        return JSON.stringify(config);
    }

    /**
     * Clear avatar cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Generate a simple grey fallback avatar
     */
    generateFallbackAvatar() {
        const config = {
            hair: 'short',
            hairColor: 'brown',
            skinTone: 'medium',
            age: 'youngAdult',
            gender: 'other',
            clothing: 'businessCasual'
        };
        
        const avatar = this.generateAvatar(config);
        
        // Make it grey/neutral
        avatar.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.color.setHex(0x808080);
            }
        });
        
        return avatar;
    }
}

// Export the avatar generator
window.AvatarGenerator = AvatarGenerator;

console.log('👤 Avatar Generator loaded');
