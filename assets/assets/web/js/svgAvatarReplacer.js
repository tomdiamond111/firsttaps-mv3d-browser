// ============================================================================
// SVG AVATAR REPLACER - DIRECT REPLACEMENT OF EXISTING AVATAR FUNCTIONS
// ============================================================================

// CRITICAL: This file provides direct replacement for existing avatar creation
// Simple integration - no complex bridge patterns until basic functionality works

// Store original avatar functions (in case we need to fallback)
let originalGenerateContactAvatar = null;
let originalUpdateContactAvatar = null;
let originalAvatarGenerator = null;
let originalContactCustomizationManager = null;

// Store avatar configurations by contact ID
const contactAvatarConfigs = new Map();

// Generate contact avatar using HTML demo SVG system
function generateContactAvatarSVG(contactId, contactData) {
    console.log('🎨 Generating SVG avatar for contact:', contactId);
    
    // Get or create avatar configuration for this contact
    let config = contactAvatarConfigs.get(contactId);
    if (!config) {
        // Create default configuration based on contact data
        config = createDefaultAvatarConfig(contactData);
        contactAvatarConfigs.set(contactId, config);
    }
    
    // Generate SVG using HTML demo engine
    if (typeof generateAvatarSVG === 'function') {
        const svgContent = generateAvatarSVG(config);
        console.log('Generated SVG for contact', contactId, '- length:', svgContent.length);
        return svgContent;
    } else {
        console.error('❌ generateAvatarSVG function not available');
        return '<svg width="100" height="160"><rect fill="#CCCCCC" width="100" height="160"/><text x="50" y="80" text-anchor="middle" fill="#666">SVG</text></svg>';
    }
}

// Create default avatar configuration based on contact data
function createDefaultAvatarConfig(contactData) {
    // Extract info from contact data if available
    const name = contactData?.name || contactData?.displayName || '';
    const gender = detectGenderFromName(name);
    
    // Create varied configurations to avoid identical avatars
    const configVariations = [
        {
            gender: gender,
            faceShape: 'oval',
            skinTone: '#FDBCB4',
            hairStyle: 'short',
            hairColor: '#8B4513',
            eyeShape: 'almond',
            eyeColor: '#4169E1'
        },
        {
            gender: gender,
            faceShape: 'round',
            skinTone: '#E0AC69',
            hairStyle: 'medium',
            hairColor: '#000000',
            eyeShape: 'round',
            eyeColor: '#8B4513'
        },
        {
            gender: gender,
            faceShape: 'square',
            skinTone: '#C68642',
            hairStyle: 'short',
            hairColor: '#FFD700',
            eyeShape: 'narrow',
            eyeColor: '#228B22'
        }
    ];
    
    // Use contact ID hash to pick consistent variation
    const contactHash = simpleHash(name + (contactData?.phoneNumber || ''));
    const variationIndex = contactHash % configVariations.length;
    const baseConfig = configVariations[variationIndex];
    
    // Add default clothing and styling
    return {
        ...baseConfig,
        clothing: 'business',
        clothingStyle: 'pants',
        clothingColor: '#4169E1',
        sleeveStyle: 'short',
        accessories: [],
        beard: gender === 'male' && (contactHash % 3 === 0), // 1/3 chance of beard for males
        theme: '' // No theme by default
    };
}

// Simple gender detection from name (basic heuristics)
function detectGenderFromName(name) {
    if (!name) return 'male'; // Default to male
    
    const nameLower = name.toLowerCase();
    const femaleNames = ['mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen', 'nancy', 'lisa', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah', 'dorothy', 'lisa', 'nancy', 'karen', 'betty', 'helen'];
    const femaleEndings = ['a', 'e', 'ia', 'ina', 'ette', 'elle'];
    
    // Check against common female names
    for (const femaleName of femaleNames) {
        if (nameLower.includes(femaleName)) {
            return 'female';
        }
    }
    
    // Check common female name endings
    for (const ending of femaleEndings) {
        if (nameLower.endsWith(ending)) {
            return 'female';
        }
    }
    
    return 'male'; // Default to male
}

// Simple hash function for consistent avatar variations
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// Replace existing generateContactAvatar function
function replaceGenerateContactAvatar() {
    // Store original function if it exists
    if (typeof generateContactAvatar === 'function' && !originalGenerateContactAvatar) {
        originalGenerateContactAvatar = generateContactAvatar;
        console.log('📦 Stored original generateContactAvatar function');
    }
    
    // Replace with SVG version
    window.generateContactAvatar = function(contactId, contactData) {
        console.log('🎨 SVG Avatar Replacer: Generating avatar for', contactId);
        return generateContactAvatarSVG(contactId, contactData);
    };
    
    console.log('✅ Replaced generateContactAvatar with SVG version');
}

// Replace existing updateContactAvatar function
function replaceUpdateContactAvatar() {
    // Store original function if it exists
    if (typeof updateContactAvatar === 'function' && !originalUpdateContactAvatar) {
        originalUpdateContactAvatar = updateContactAvatar;
        console.log('📦 Stored original updateContactAvatar function');
    }
    
    // Replace with SVG version
    window.updateContactAvatar = function(contactId, newConfig) {
        console.log('🎨 SVG Avatar Replacer: Updating avatar for', contactId);
        
        // Update stored configuration
        if (newConfig) {
            contactAvatarConfigs.set(contactId, newConfig);
        }
        
        // If explore avatar, do not proceed with contact lookup path
        if (contactId === 'exploreAvatar') {
            try {
                const cfg = newConfig || getContactAvatarConfig(contactId) || createDefaultAvatarConfig({});
                const svgContent = (typeof generateAvatarSVG === 'function') ? generateAvatarSVG(cfg) : '';
                if (svgContent && typeof window.updateExploreAvatarFromSVG === 'function') {
                    const ok = window.updateExploreAvatarFromSVG(svgContent);
                    console.log(ok ? '✅ Explore avatar updated via direct SVG (global path)' : '⚠️ Explore avatar direct update not applied');
                }
                // Persist using Explore manager
                const cfg3d = convertSVGConfigTo3DConfig(cfg);
                window.ExploreAvatarCustomizationManager?.instance?.saveExploreAvatarCustomization?.(cfg3d);
                setTimeout(() => window.ExploreAvatarCustomizationManager?.instance?.updateExploreAvatar?.(), 50);
            } catch (e) {
                console.warn('🎨 Explore avatar global update error:', e);
            }
            return (typeof generateAvatarSVG === 'function') ? generateAvatarSVG(newConfig || getContactAvatarConfig(contactId) || createDefaultAvatarConfig({})) : '';
        }

        // Get contact data (try to find it in existing systems)
        let contactData = {};
        if (typeof getContactData === 'function') {
            contactData = getContactData(contactId) || {};
        }
        
        // Generate new SVG
        return generateContactAvatarSVG(contactId, contactData);
    };
    
    console.log('✅ Replaced updateContactAvatar with SVG version');
}

// Get avatar configuration for a contact (for customization UI)
function getContactAvatarConfig(contactId) {
    // First try to get from existing ContactCustomizationManager
    if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance) {
        const existingConfig = window.ContactCustomizationManager.instance.getContactCustomization(contactId);
        if (existingConfig) {
            // Convert 3D avatar config to SVG config format
            return convertTo3DConfigToSVGConfig(existingConfig);
        }
    }
    
    // Fallback to our local storage
    return contactAvatarConfigs.get(contactId) || null;
}

// Update avatar configuration for a contact
function updateContactAvatarConfig(contactId, newConfig) {
    console.log('🎨 Updating avatar config for contact', contactId);
    
    // Store in our local map
    contactAvatarConfigs.set(contactId, newConfig);
    
    // Also save via existing ContactCustomizationManager persistence system
    if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance) {
        // Convert SVG config back to 3D format for storage
        const config3D = convertSVGConfigTo3DConfig(newConfig);
        window.ContactCustomizationManager.instance.saveContactCustomization(contactId, config3D);
        console.log('🎨 Saved via existing ContactCustomizationManager:', contactId);
    }
    
    // Trigger regeneration
    if (typeof updateContactAvatar === 'function') {
        return updateContactAvatar(contactId, newConfig);
    }
    
    return generateContactAvatarSVG(contactId, {});
}

// Apply avatar to Three.js object (simplified integration)
function applyAvatarToThreeJSObject(object3D, svgContent, contactId) {
    console.log('🎨 Applying SVG avatar to Three.js object for contact', contactId);
    
    try {
        // Create canvas-based texture for better compatibility
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 100;
        canvas.height = 160;
        
        // Render simple avatar directly to canvas
        ctx.fillStyle = '#FDBCB4'; // Skin tone
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Simple avatar representation
        // Face
        ctx.fillStyle = '#FDBCB4';
        ctx.beginPath();
        ctx.arc(50, 50, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Hair
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(50, 35, 35, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(42, 45, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(58, 45, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Nose
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 52);
        ctx.lineTo(48, 58);
        ctx.stroke();
        
        // Mouth
        ctx.beginPath();
        ctx.arc(50, 62, 8, 0, Math.PI);
        ctx.stroke();
        
        // Body
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(35, 80, 30, 60);
        
        // Arms
        ctx.fillStyle = '#FDBCB4';
        ctx.fillRect(25, 85, 10, 35);
        ctx.fillRect(65, 85, 10, 35);
        
        // Legs
        ctx.fillStyle = '#000080';
        ctx.fillRect(40, 140, 8, 20);
        ctx.fillRect(52, 140, 8, 20);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.flipY = false;
        
        // Apply to object material
        if (object3D.material) {
            if (Array.isArray(object3D.material)) {
                // Multiple materials - apply to the first one that accepts maps
                for (const material of object3D.material) {
                    if (material.map !== undefined) {
                        material.map = texture;
                        material.needsUpdate = true;
                        break;
                    }
                }
            } else {
                // Single material
                if (object3D.material.map !== undefined) {
                    object3D.material.map = texture;
                    object3D.material.needsUpdate = true;
                }
            }
        }
        
        console.log('✅ Applied SVG avatar texture to Three.js object');
        return true;
    } catch (error) {
        console.error('❌ Error applying SVG avatar to Three.js object:', error);
        return false;
    }
}

// Update Explore Avatar texture directly from SVG content (fast path, no rebuild)
function updateExploreAvatarFromSVG(svgContent) {
    try {
        if (!window.app || !window.app.scene) return false;

        // Find the explore avatar mesh that carries the texture
        let targetMesh = null;
        window.app.scene.traverse((child) => {
            if (child.isMesh && (child.name === 'ExploreAvatarMesh_Stable' || child.userData?.isExploreAvatar)) {
                // Prefer the stable named mesh
                if (child.name === 'ExploreAvatarMesh_Stable') {
                    targetMesh = child;
                } else if (!targetMesh) {
                    targetMesh = child;
                }
            }
        });

        if (!targetMesh) {
            console.warn('🎨 No explore avatar mesh found for direct texture update');
            return false;
        }

        // Render SVG onto a canvas, then create a CanvasTexture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 160;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.onload = function() {
            try {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const newTexture = new THREE.CanvasTexture(canvas);
                newTexture.needsUpdate = true;
                newTexture.flipY = true;

                if (Array.isArray(targetMesh.material)) {
                    targetMesh.material.forEach(m => {
                        if (m.map !== undefined) {
                            m.map = newTexture;
                            m.needsUpdate = true;
                        }
                    });
                } else if (targetMesh.material) {
                    targetMesh.material.map = newTexture;
                    targetMesh.material.transparent = true;
                    targetMesh.material.alphaTest = 0.01;
                    targetMesh.material.needsUpdate = true;
                }
                URL.revokeObjectURL(url);
                console.log('🎨 ✅ Explore avatar texture updated from SVG');
            } catch (e) {
                console.warn('🎨 Failed to apply explore avatar texture:', e);
                URL.revokeObjectURL(url);
            }
        };
        img.onerror = function() {
            URL.revokeObjectURL(url);
        };
        img.src = url;
        return true;
    } catch (e) {
        console.error('🎨 Error in updateExploreAvatarFromSVG:', e);
        return false;
    }
}

// Create SVG-based Three.js avatar object from SVG content
function createSVGAvatarObject(svgContent, contactId) {
    console.log('🎨 Creating SVG avatar Three.js object for contact:', contactId);
    console.log('🎨 SVG content length:', svgContent.length);
    console.log('🎨 SVG content preview:', svgContent.substring(0, 200) + '...');
    
    try {
        // Create avatar group
        const avatar = new THREE.Group();
        avatar.name = contactId === 'exploreAvatar' ? 'ExploreAvatar' : 'ContactAvatar';
        avatar.userData = {
            type: contactId === 'exploreAvatar' ? 'exploreAvatar' : 'avatar',
            isAvatar: true,
            isSVGBased: true,
            parentContactId: contactId,
            name: `avatar_${contactId}`
        };
        
        // Create a plane to display the SVG (bigger and properly oriented)
        const geometry = new THREE.PlaneGeometry(2, 3.2, 32, 32); // Add more segments for better quality
        
        console.log('🎨 PlaneGeometry created with dimensions 2x3.2 and 32x32 segments');
        
        // Clean and encode SVG content properly
        const cleanSvgContent = svgContent ? svgContent.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim() : '';
        
        // Debug: Log the actual SVG content
        console.log('🎨 SVG Content (first 300 chars):', cleanSvgContent.substring(0, 300));
        console.log('🎨 SVG Content length:', cleanSvgContent.length);
        
        // Create canvas and render the actual SVG content
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match SVG viewBox (100x160)
        canvas.width = 100;
        canvas.height = 160;
        
        // Make canvas completely transparent - no background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // If we have valid SVG content, render it directly to canvas
        if (cleanSvgContent && cleanSvgContent.includes('<svg') && cleanSvgContent.includes('</svg>')) {
            console.log('🎨 Rendering actual SVG content to canvas');
            
            try {
                // Validate and clean SVG content more thoroughly
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(cleanSvgContent, 'image/svg+xml');
                const parseError = svgDoc.querySelector('parsererror');
                
                if (parseError) {
                    console.error('🎨 ❌ SVG parsing error:', parseError.textContent);
                    throw new Error('Invalid SVG content');
                }
                
                // Get the cleaned SVG content
                const svgElement = svgDoc.querySelector('svg');
                if (!svgElement) {
                    throw new Error('No SVG element found');
                }
                
                // Ensure proper SVG namespace and attributes
                svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                const cleanedSvg = new XMLSerializer().serializeToString(svgElement);
                
                // Create an image from the SVG content
                const img = new Image();
                const svgBlob = new Blob([cleanedSvg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                
                // Create texture that will be updated when SVG loads
                var texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                texture.flipY = true;
                
                img.onload = function() {
                    console.log('🎨 SVG image loaded successfully, drawing to canvas');
                    // Clear to transparent and draw SVG
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    texture.needsUpdate = true;
                    URL.revokeObjectURL(url);
                    console.log('🎨 ✅ Actual SVG avatar rendered to texture');
                };
                
                img.onerror = function(error) {
                    console.error('🎨 ❌ SVG image failed to load:', error);
                    console.error('🎨 ❌ SVG content causing error:', cleanedSvg.substring(0, 500) + '...');
                    // Keep canvas transparent - no fallback drawing
                    URL.revokeObjectURL(url);
                };
                
                img.src = url;
                
            } catch (error) {
                console.error('🎨 ❌ Error processing SVG:', error);
                // Create texture from transparent canvas as fallback
                var texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                texture.flipY = true;
            }
            
        } else {
            console.log('🎨 No valid SVG content provided, creating transparent texture');
            // Create texture from transparent canvas
            var texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            texture.flipY = true;
        }
        
        // Create material with SVG texture - use MeshBasicMaterial to preserve colors
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            alphaTest: 0.01, // Very low threshold so only actual content shows
            side: THREE.DoubleSide, // Make avatar visible from both sides
            opacity: 1.0 // Full opacity for SVG content
        });
        
        console.log('🎨 Material created with texture map:', !!material.map);
        console.log('🎨 Texture dimensions when loaded:', texture.image ? `${texture.image.width}x${texture.image.height}` : 'not loaded yet');
        
        // Create mesh
        const avatarMesh = new THREE.Mesh(geometry, material);
        avatarMesh.name = 'AvatarBody';
        avatarMesh.userData = {
            type: 'avatarComponent',
            isAvatarPart: true,
            parentContactId: contactId
        };
        
        // Position and orient the avatar mesh properly
        if (contactId === 'exploreAvatar') {
            // For explore avatar - position at ground level standing upright
            avatarMesh.position.set(0, 1.6, 0);
            avatarMesh.rotation.x = 0; // Keep upright
            // Add a stable name to identify explore avatar meshes for efficient updates
            avatarMesh.name = 'ExploreAvatarMesh_Stable';
            avatarMesh.userData.isExploreAvatar = true;
            avatarMesh.userData.isStableRendering = true; // Flag for stable rendering
            // Ensure consistent material properties to reduce flickering
            if (avatarMesh.material) {
                avatarMesh.material.needsUpdate = false; // Prevent unnecessary updates
                avatarMesh.material.transparent = true;
                avatarMesh.material.alphaTest = 0.1; // Improve transparency handling
            }
        } else if (contactId === 'customization-preview') {
            // For preview avatar - position for UI preview
            avatarMesh.position.set(0, 0, 0);
            avatarMesh.rotation.x = 0; // Keep upright
            avatarMesh.name = 'PreviewAvatarMesh';
        } else {
            // For contact avatars - position standing on top of contact object surface
            // Contact objects have height 2.5, so top surface is at Y=1.25
            // Avatar plane geometry is 3.2 units tall, scaled to 0.4 = 1.28 units
            // Position so avatar stands on top surface: Y = 1.25 + (1.28/2) = 1.89
            avatarMesh.position.set(0, 1.89, 0); // Restored to original position on top
            // Scale down to be more like a name tag
            avatarMesh.scale.set(0.4, 0.4, 0.4);
            // Keep upright
            avatarMesh.rotation.x = 0;
            avatarMesh.name = `ContactAvatarMesh_${contactId}`;
        }
        
        // Add mesh to avatar group
        avatar.add(avatarMesh);
        
        // Do NOT add any shadow/octagon for contact avatars - they were causing the grey octagon issue
        if (contactId === 'exploreAvatar') {
            // Only add shadow for explore avatar
            const shadowGeometry = new THREE.CircleGeometry(0.8, 8);
            const shadowMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x000000, 
                opacity: 0.3, 
                transparent: true 
            });
            const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
            shadow.rotation.x = -Math.PI / 2; // Lay flat on ground
            shadow.position.y = 0.01; // Slightly above ground to avoid z-fighting
            shadow.name = 'AvatarShadow';
            avatar.add(shadow);
        }
        
        console.log('✅ Created SVG avatar Three.js object with mesh and shadow');
        return avatar;
    } catch (error) {
        console.error('❌ Error creating SVG avatar Three.js object:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Fallback: create a simple colored cube with text
        console.log('🎨 Creating fallback avatar cube');
        const fallbackGeometry = new THREE.BoxGeometry(1, 2, 0.5);
        const fallbackMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        fallbackMesh.position.y = 1;
        
        const fallbackAvatar = new THREE.Group();
        fallbackAvatar.add(fallbackMesh);
        fallbackAvatar.name = contactId === 'exploreAvatar' ? 'ExploreAvatar' : 'ContactAvatar';
        fallbackAvatar.userData = {
            type: contactId === 'exploreAvatar' ? 'exploreAvatar' : 'avatar',
            isAvatar: true,
            isSVGBased: false,
            isFallback: true,
            parentContactId: contactId
        };
        
        console.log('✅ Created fallback avatar cube');
        return fallbackAvatar;
    }
}

// Replace AvatarGenerator class
function replaceAvatarGenerator() {
    // Store original AvatarGenerator if it exists
    if (typeof window.AvatarGenerator === 'function' && !originalAvatarGenerator) {
        originalAvatarGenerator = window.AvatarGenerator;
        console.log('📦 Stored original AvatarGenerator class');
    }
    
    // Create new SVG-based AvatarGenerator
    window.AvatarGenerator = class SVGAvatarGenerator {
        constructor() {
            this.cache = new Map(); // Cache generated avatars for performance
            console.log('🎨 SVG-based AvatarGenerator created');
        }
        
        generateAvatar(options = {}) {
            console.log('🎨 SVG AvatarGenerator: Generating avatar with options:', options);
            
            // Determine contact ID for this avatar generation
            const contactId = options.contactId || options.parentContactId || 'unknown_' + Date.now();
            console.log('🎨 Using contact ID:', contactId);
            
            // Convert old 3D avatar config format to HTML demo SVG format
            let svgConfig;
            // Check if 'options' is already an SVG config or needs conversion
            // A simple heuristic: SVG configs use 'hairStyle' and hex colors. 3D configs use 'hair' and string names.
            if (options.hairStyle && options.skinTone && typeof options.skinTone === 'string' && options.skinTone.startsWith('#')) {
                console.log('🎨 Config appears to be in SVG format, using directly.');
                svgConfig = options;
            } else {
                console.log('🎨 Config appears to be in 3D format, converting to SVG.');
                svgConfig = convertTo3DConfigToSVGConfig(options);
            }
            console.log('🎨 Final SVG config for generation:', svgConfig);
            
            // Check cache first
            const cacheKey = contactId + '_' + JSON.stringify(svgConfig);
            if (this.cache.has(cacheKey)) {
                console.log('🎨 Returning cached SVG avatar for', contactId);
                return this.cache.get(cacheKey).clone();
            }
            
            // Generate SVG content using the HTML demo engine
            console.log('🎨 Generating SVG content...');
            if (typeof generateAvatarSVG !== 'function') {
                console.error('❌ generateAvatarSVG function not available!');
                // Create a simple fallback avatar
                return this.createFallbackAvatar(contactId);
            }
            
            const svgContent = generateAvatarSVG(svgConfig);
            console.log('🎨 Generated SVG content length:', svgContent.length);
            console.log('🎨 SVG preview:', svgContent.substring(0, 300) + '...');
            
            if (!svgContent || svgContent.length < 100) {
                console.error('❌ Invalid SVG content generated');
                return this.createFallbackAvatar(contactId);
            }
            
            // Create Three.js object from SVG
            const avatar = createSVGAvatarObject(svgContent, contactId);
            
            // Store the original config in userData for later reference
            avatar.userData.originalConfig = options;
            avatar.userData.svgConfig = svgConfig;
            avatar.userData.contactId = contactId;
            
            // Cache the result
            this.cache.set(cacheKey, avatar);
            
            console.log('✅ SVG AvatarGenerator: Created new avatar for', contactId);
            return avatar.clone();
        }
        
        createFallbackAvatar(contactId) {
            console.log('🎨 Creating fallback avatar for', contactId);
            const fallbackGeometry = new THREE.BoxGeometry(1, 2, 0.5);
            const fallbackMaterial = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
            const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
            fallbackMesh.position.y = 1;
            
            const fallbackAvatar = new THREE.Group();
            fallbackAvatar.add(fallbackMesh);
            fallbackAvatar.name = contactId === 'exploreAvatar' ? 'ExploreAvatar' : 'ContactAvatar';
            fallbackAvatar.userData = {
                type: contactId === 'exploreAvatar' ? 'exploreAvatar' : 'avatar',
                isAvatar: true,
                isSVGBased: false,
                isFallback: true,
                parentContactId: contactId,
                contactId: contactId
            };
            
            return fallbackAvatar;
        }
        
        getCacheKey(config) {
            return JSON.stringify(config);
        }
    };
    
    console.log('✅ Replaced AvatarGenerator with SVG version');
}

// Convert old 3D avatar config to HTML demo SVG config
function convertTo3DConfigToSVGConfig(oldConfig) {
    console.log('🎨 Converting 3D config to SVG config:', oldConfig);
    
    // Map old config format to new SVG format
    const svgConfig = {
        // Gender mapping
        gender: oldConfig.gender || 'male',
        
        // Face shape mapping
        faceShape: 'oval', // Default, could be enhanced based on oldConfig
        
        // Skin tone mapping
        skinTone: mapSkinTone(oldConfig.skinTone),
        
        // Hair mapping
        hairStyle: mapHairStyle(oldConfig.hair),
        hairColor: mapHairColor(oldConfig.hairColor),
        
        // Eye mapping  
        eyeShape: 'almond', // Default
        eyeColor: '#4169E1', // Default blue
        
        // Clothing mapping
        clothing: mapClothing(oldConfig.clothing),
        clothingStyle: oldConfig.clothingStyle || 'pants', // Default
        clothingColor: oldConfig.clothingColor || '#4169E1', // Default blue
        sleeveStyle: 'short', // Default
        
        // Accessories
        accessories: [],
        
        // Beard (for males)
        beard: oldConfig.gender === 'male' && Math.random() > 0.7, // Random beard for variety
        
    // Theme: honor explicit theme only; do not auto-map from clothing
    theme: (oldConfig && oldConfig.theme !== undefined) ? oldConfig.theme : ''
    };
    
    console.log('🎨 Converted to SVG config:', svgConfig);
    return svgConfig;
}

// Convert SVG config back to 3D avatar config for persistence
function convertSVGConfigTo3DConfig(svgConfig) {
    console.log('🎨 Converting SVG config to 3D config:', svgConfig);
    
    const config3D = {
        hair: reversMapHairStyle(svgConfig.hairStyle),
        hairColor: reversMapHairColor(svgConfig.hairColor),
        skinTone: reversMapSkinTone(svgConfig.skinTone),
        age: svgConfig.age || 'youngAdult',
        gender: svgConfig.gender || 'male',
        clothing: reversMapClothing(svgConfig.clothing),
        clothingStyle: svgConfig.clothingStyle,
        clothingColor: svgConfig.clothingColor,
        theme: svgConfig.theme || '' // FIXED: Preserve theme information
    };
    
    console.log('🎨 Converted to 3D config:', config3D);
    return config3D;
}

// Convert 3D avatar config to SVG config (for loading saved configurations)
function convert3DConfigToSVGConfig(config3D) {
    console.log('🎨 Converting 3D config to SVG config:', config3D);
    
    const svgConfig = {
        gender: config3D.gender || 'male',
        faceShape: 'oval',
        skinTone: mapSkinTone(config3D.skinTone),
        hairStyle: mapHairStyle(config3D.hair),
        hairColor: mapHairColor(config3D.hairColor),
        eyeShape: 'almond',
        eyeColor: '#4169E1',
        clothing: mapClothing(config3D.clothing),
        clothingStyle: config3D.clothingStyle || 'pants',
        clothingColor: config3D.clothingColor || '#4169E1',
        sleeveStyle: 'short',
        accessories: [],
        beard: config3D.gender === 'male' && Math.random() > 0.7, // Some chance of beard
        theme: config3D.theme || '', // FIXED: Preserve theme instead of hardcoding empty string
        age: config3D.age || 'youngAdult'
    };
    
    console.log('🎨 Converted to SVG config:', svgConfig);
    return svgConfig;
}

// Helper functions for config mapping
function mapSkinTone(oldSkinTone) {
    const mapping = {
        'light': '#FDBCB4',
        'medium': '#E0AC69', 
        'tan': '#C68642',
        'dark': '#8D5524'
    };
    return mapping[oldSkinTone] || '#FDBCB4';
}

function mapHairStyle(oldHair) {
    const mapping = {
        'short': 'short',
        'medium': 'medium',
        'long': 'long',
        'bald': 'bald'
    };
    return mapping[oldHair] || 'short';
}

function mapHairColor(oldHairColor) {
    const mapping = {
        'brown': '#8B4513',
        'blonde': '#FFD700',
        'black': '#000000',
        'red': '#B22222',
        'gray': '#808080'
    };
    return mapping[oldHairColor] || '#8B4513';
}

function mapClothing(oldClothing) {
    const mapping = {
        'business': 'business',
        'casual': 'casual', 
        'formal': 'formal',
        'farmer': 'casual',
        'medical': 'medical'
    };
    return mapping[oldClothing] || 'business';
}

function mapTheme(oldClothing) {
    const mapping = {
        'farmer': 'farmer',
        'medical': 'doctor',
        'business': 'businessCasual'
    };
    return mapping[oldClothing] || '';
}

// Reverse mapping functions for converting back to 3D format
function reversMapHairStyle(svgHair) {
    const mapping = {
        'short': 'short',
        'medium': 'medium', 
        'long': 'long',
        'bald': 'bald'
    };
    return mapping[svgHair] || 'short';
}

function reversMapHairColor(svgHairColor) {
    const mapping = {
        '#8B4513': 'brown',
        '#FFD700': 'blonde',
        '#000000': 'black',
        '#B22222': 'red',
        '#808080': 'gray'
    };
    return mapping[svgHairColor] || 'brown';
}

function reversMapSkinTone(svgSkinTone) {
    const mapping = {
        '#FDBCB4': 'light',
        '#E0AC69': 'medium',
        '#C68642': 'tan', 
        '#8D5524': 'dark'
    };
    return mapping[svgSkinTone] || 'light';
}

function reversMapClothing(svgClothing) {
    const mapping = {
        'business': 'business',
        'casual': 'casual',
        'formal': 'formal',
        'medical': 'medical'
    };
    return mapping[svgClothing] || 'business';
}

// Replace ContactCustomizationManager methods to use HTML demo UI
function replaceContactCustomizationManager() {
    // Wait for ContactCustomizationManager to be available
    if (!window.ContactCustomizationManager) {
        console.warn('⚠️ ContactCustomizationManager not available yet, retrying...');
        setTimeout(replaceContactCustomizationManager, 100);
        return;
    }
    
    // Store original methods
    const originalShowMenu = window.ContactCustomizationManager.prototype.showCustomizationMenu;
    const originalUpdateAvatar = window.ContactCustomizationManager.prototype.updateContactAvatar;
    
    // Replace showCustomizationMenu to use HTML demo UI
    window.ContactCustomizationManager.prototype.showCustomizationMenu = function(contactId) {
        console.log('🎨 SVG Customization: Showing menu for contact', contactId);
        
        // Store current contact ID on both instance and globally
        this.currentContactId = contactId;
        window.currentActiveContactId = contactId;
        
        // Get or create container
        let container = document.getElementById('avatar-customization-menu');
        if (!container) {
            container = document.createElement('div');
            container.id = 'avatar-customization-menu';
            container.style.position = 'fixed';
            container.style.top = '10px';
            container.style.left = '10px';
            container.style.right = '10px';
            container.style.bottom = '10px';
            container.style.zIndex = '10000';
            container.style.width = 'calc(100vw - 20px)';
            container.style.height = 'calc(100vh - 20px)';
            container.style.maxWidth = 'none';
            container.style.maxHeight = 'none';
            container.style.overflow = 'auto';
            container.style.overflowY = 'scroll';
            container.style.backgroundColor = 'rgba(255,255,255,0.98)';
            container.style.padding = '20px';
            container.style.borderRadius = '12px';
            container.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
            container.style.fontFamily = 'Arial, sans-serif';
            container.style.fontSize = '14px';
            container.style.border = '2px solid #ccc';
            container.style.WebkitOverflowScrolling = 'touch'; // iOS smooth scrolling
            container.style.scrollBehavior = 'smooth';
            container.style.boxSizing = 'border-box';
            document.body.appendChild(container);
        }
        
        // Store the contact ID in the container for reference
        container.dataset.contactId = contactId;
        
        // Initialize HTML demo customization UI
        if (typeof initializeAvatarCustomizationUI === 'function') {
            // Get current avatar config for this contact
            let config = getContactAvatarConfig(contactId);
            if (!config) {
                // Create default config
                config = createDefaultAvatarConfig({});
                contactAvatarConfigs.set(contactId, config);
            }
            
            // Update current config in UI
            window.currentAvatarConfig = config;
            
            // Clear container and initialize UI
            container.innerHTML = '';
            initializeAvatarCustomizationUI(container);
            
            // Add Done and Cancel buttons below the demo avatar
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.textAlign = 'center';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '10px';
            buttonContainer.style.justifyContent = 'center';
            
            // Done button
            const doneButton = document.createElement('button');
            doneButton.textContent = 'Done';
            doneButton.style.padding = '12px 24px';
            doneButton.style.backgroundColor = '#4CAF50';
            doneButton.style.color = 'white';
            doneButton.style.border = 'none';
            doneButton.style.borderRadius = '6px';
            doneButton.style.cursor = 'pointer';
            doneButton.style.fontSize = '16px';
            doneButton.style.fontWeight = 'bold';
            doneButton.style.fontFamily = 'Arial, sans-serif';
            doneButton.onclick = () => {
                // Capture contact ID from multiple sources for reliability
                const contactId = this.currentContactId || window.currentActiveContactId || container.dataset.contactId;
                
                // CRITICAL: Set timestamp to prevent any avatar restoration after Done button
                window.lastAvatarCustomizationTime = Date.now();
                console.log('🎨 Done button clicked - set avatar customization timestamp to prevent restoration');
                
                // Save the current avatar configuration before closing
                if (contactId && window.currentAvatarConfig) {
                    console.log('🎨 Saving avatar configuration for contact:', contactId);
                    console.log('🎨 Configuration to save:', window.currentAvatarConfig);
                    
                    // Save via ContactCustomizationManager
                    if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance) {
                        window.ContactCustomizationManager.instance.saveContactCustomization(contactId, window.currentAvatarConfig);
                        console.log('✅ Avatar configuration saved via ContactCustomizationManager');
                    }
                    
                    // CRITICAL: Dispatch the avatarConfigUpdated event to trigger final scene update
                    // This is what was missing - the REF version had this!
                    if (typeof generateAvatarSVG === 'function') {
                        const svgContent = generateAvatarSVG(window.currentAvatarConfig);
                        const event = new CustomEvent('avatarConfigUpdated', {
                            detail: {
                                config: window.currentAvatarConfig,
                                svgContent: svgContent,
                                contactId: contactId, // FIXED: Ensure contactId is included in event
                                isDoneButton: true, // Flag to indicate this is from Done button
                                skipContactLookup: contactId === 'exploreAvatar' // Skip contact object lookup for explore avatar
                            }
                        });
                        document.dispatchEvent(event);
                        console.log('✅ Dispatched final avatarConfigUpdated event for Done button with contactId:', contactId);
                    }
                    
                    // ENHANCED: Force immediate avatar update with multiple methods
                    
                    // Method 1: Update via updateContactAvatar function if available
                    if (typeof updateContactAvatar === 'function') {
                        updateContactAvatar(contactId, window.currentAvatarConfig);
                        console.log('✅ Avatar updated in scene via updateContactAvatar');
                    }
                    
                    // Method 2: Update via ContactCustomizationManager
                    if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance && window.ContactCustomizationManager.instance.updateContactAvatar) {
                        window.ContactCustomizationManager.instance.updateContactAvatar(contactId);
                        console.log('✅ SVG avatar updated via ContactCustomizationManager instance');
                    }
                    
                    // Method 3: Force SVG avatar generation and scene update
                    if (typeof updateContactAvatarFromCurrentConfig === 'function') {
                        updateContactAvatarFromCurrentConfig(contactId, window.currentAvatarConfig);
                        console.log('✅ Avatar updated via updateContactAvatarFromCurrentConfig');
                    }
                    
                    // Method 4: Force immediate scene refresh to ensure changes are visible
                    setTimeout(() => {
                        if (window.scene && window.renderer) {
                            window.renderer.render(window.scene, window.camera);
                            console.log('✅ Forced scene render to display avatar changes');
                        }
                    }, 100);
                } else {
                    console.warn('⚠️ Cannot save avatar - missing contact ID or configuration');
                    console.log('Contact ID sources:', {
                        thisCurrentContactId: this.currentContactId,
                        windowCurrentActiveContactId: window.currentActiveContactId,
                        containerDatasetContactId: container.dataset.contactId
                    });
                }
                
                container.style.display = 'none';
                this.currentContactId = null; // Clear current contact
                window.currentActiveContactId = null; // Clear global contact ID
                container.dataset.contactId = ''; // Clear container contact ID
            };
            
            // Cancel button
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.padding = '12px 24px';
            cancelButton.style.backgroundColor = '#f44336';
            cancelButton.style.color = 'white';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '6px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.style.fontSize = '16px';
            cancelButton.style.fontWeight = 'bold';
            cancelButton.style.fontFamily = 'Arial, sans-serif';
            cancelButton.onclick = () => {
                container.style.display = 'none';
                this.currentContactId = null; // Clear current contact
                window.currentActiveContactId = null; // Clear global contact ID
                container.dataset.contactId = ''; // Clear container contact ID
                
                // Revert to original avatar config if available
                const originalConfig = getContactAvatarConfig(contactId);
                if (originalConfig) {
                    window.currentAvatarConfig = originalConfig;
                    // Trigger avatar update to revert changes
                    if (this.updateContactAvatar) {
                        this.updateContactAvatar(contactId);
                    }
                }
            };
            
            buttonContainer.appendChild(doneButton);
            buttonContainer.appendChild(cancelButton);
            
            // Insert buttons after the demo avatar preview (which should be the first child)
            const previewContainer = container.querySelector('#avatar-preview-container') || container.firstElementChild;
            if (previewContainer && previewContainer.nextSibling) {
                container.insertBefore(buttonContainer, previewContainer.nextSibling);
            } else {
                container.appendChild(buttonContainer);
            }
            
            // Show container
            container.style.display = 'block';
            
            console.log('✅ SVG Customization UI displayed');
        } else {
            console.error('❌ HTML demo customization UI not available');
            // Fallback to original method
            if (originalShowMenu) {
                originalShowMenu.call(this, contactId);
            }
        }
    };
    
    // Replace updateContactAvatar to use SVG system
    window.ContactCustomizationManager.prototype.updateContactAvatar = function (contactId, svgConfig) {
        console.log(`🎨 SVG Avatar Replacer: Updating avatar for ${contactId}`);

        if (!contactId) {
            console.warn('🎨 SVG Avatar Replacer: updateContactAvatar called with null or undefined contactId. Skipping.');
            return;
        }

        // Special handling for exploreAvatar - it doesn't have a contact object, it has its own system.
        if (contactId === 'exploreAvatar' || contactId === 'EXPLORE_AVATAR') {
            console.log('🎨 Handling explore avatar update separately.');
            try {
                const cfg = svgConfig || getContactAvatarConfig(contactId) || createDefaultAvatarConfig({});
                const svgContent = (typeof generateAvatarSVG === 'function') ? generateAvatarSVG(cfg) : '';
                if (svgContent && typeof window.updateExploreAvatarFromSVG === 'function') {
                    const ok = window.updateExploreAvatarFromSVG(svgContent);
                    console.log(ok ? '✅ Explore avatar updated via direct SVG path.' : '⚠️ Explore avatar direct update failed.');
                }
                // Also try to persist through the explore manager
                if (window.ExploreAvatarCustomizationManager?.instance?.saveExploreAvatarCustomization) {
                    const cfg3d = convertSVGConfigTo3DConfig(cfg);
                    window.ExploreAvatarCustomizationManager.instance.saveExploreAvatarCustomization(cfg3d);
                    setTimeout(() => window.ExploreAvatarCustomizationManager.instance.updateExploreAvatar(), 50);
                    console.log('🎨 Explore avatar customization persisted and update triggered.');
                }
            } catch (e) {
                console.warn('🎨 Error during special handling of explore avatar:', e);
            }
            return; // Stop further execution for explore avatar
        }

        if (!this.app || !this.app.scene) {
            console.log(`🎨 Scene not ready, retrying avatar update for ${contactId} in 100ms`);
            setTimeout(() => this.updateContactAvatar(contactId, svgConfig), 100);
            return;
        }

        // First, generate the new SVG avatar from the config
        const svgContent = generateContactAvatarSVG(contactId, {});
        
        // Find and update the actual contact avatar in the scene
        if (this.app && this.app.scene) {
            let avatarUpdated = false;
            
            // First remove any existing avatars for this contact - more thorough cleanup
            const avatarsToRemove = [];
            if (this.app && this.app.scene) { // ADDED: Extra safety check
                this.app.scene.traverse((child) => {
                    if (child.userData && String(child.userData.parentContactId) === String(contactId) && 
                        child.userData.isAvatar) {
                        avatarsToRemove.push(child);
                    }
                    // Also remove any avatars that are direct children of contact objects for this contactId
                    if (child.userData && 
                        (String(child.userData.contactId) === String(contactId) || 
                         String(child.userData.fileId) === String(contactId) ||
                         String(child.userData.id) === String(contactId))) {
                        // Remove any avatar children
                        const childAvatarsToRemove = [];
                        child.traverse((subChild) => {
                            if (subChild !== child && subChild.userData && subChild.userData.isAvatar) {
                                childAvatarsToRemove.push(subChild);
                            }
                        });
                        childAvatarsToRemove.forEach(avatar => {
                            if (avatar.parent) {
                                console.log('🎨 Removing old child avatar for contact', contactId);
                                avatar.parent.remove(avatar);
                            }
                        });
                    }
                });
            }
            
            avatarsToRemove.forEach(avatar => {
                if (avatar.parent) {
                    avatar.parent.remove(avatar);
                }
            });
            
            // Find contact object and add new avatar
            this.app.scene.traverse((contactObject) => {
                if (contactObject.userData && 
                    (String(contactObject.userData.contactId) === String(contactId) || 
                     String(contactObject.userData.fileId) === String(contactId) ||
                     String(contactObject.userData.id) === String(contactId))) {
                    
                    console.log('🎨 ✅ Found contact object for', contactId, 'adding new avatar');
                    const newAvatar = createSVGAvatarObject(svgContent, contactId);
                    newAvatar.position.set(0, 0, 0); // Relative to contact object center
                    contactObject.add(newAvatar);
                    avatarUpdated = true;
                    console.log('🎨 ✅ Added updated SVG avatar to contact object:', contactId);
                }
            });
            
            if (!avatarUpdated) {
                console.error('🎨 ❌ CONTACT LOOKUP FAILED: Could not find contact object for', contactId, 'to update avatar');
                const availableIds = [];
                if (window.scene) {
                    window.scene.traverse(function (object) {
                        if (object.userData && (object.userData.contactId || object.userData.fileId || object.userData.id)) {
                            availableIds.push(object.userData.contactId || object.userData.fileId || object.userData.id);
                        }
                    });
                    console.log(`🎨 ❌ Available contact IDs in scene: ${JSON.stringify(availableIds)}`);
                } else {
                    console.log('🎨 ❌ window.scene is not available for logging.');
                }
                console.log('🎨 ❌ This suggests a contactId mismatch - check if contactId format/type matches scene objects');
            }
        }
        
        // Update preview avatar with config
        console.log('🎨 Updating preview avatar with config:', svgConfig);
        
        // Call original function if it exists and we need any additional behavior
        if (originalUpdateAvatar && typeof originalUpdateAvatar === 'function') {
            try {
                // Don't call original - we're replacing the functionality
                // originalUpdateAvatar.call(this, contactId);
            } catch (error) {
                console.warn('🎨 Original updateContactAvatar failed:', error);
            }
        }
    };
    
    // Add method to update preview avatar
    window.ContactCustomizationManager.prototype.updatePreviewAvatar = function(config) {
        console.log('🎨 Updating preview avatar with config:', config);
        
        if (typeof window.updateAvatarPreview === 'function') {
            // Use existing preview update function if available
            window.updateAvatarPreview(config);
        } else if (window.app && window.app.scene) {
            // Find and update preview avatar directly
            window.app.scene.traverse((child) => {
                if (child.userData && child.userData.parentContactId === 'customization-preview' && 
                    child.userData.isAvatar) {
                    // Generate new SVG and update texture
                    const svgContent = generateAvatarSVG(config);
                    // Update the avatar texture with new SVG
                    this.updateAvatarTexture(child, svgContent);
                }
            });
        }
    };
    
    // Helper method to update avatar texture
    window.ContactCustomizationManager.prototype.updateAvatarTexture = function(avatarObject, svgContent) {
        try {
            // Find the mesh with texture
            let avatarMesh = null;
            if (avatarObject.type === 'Mesh') {
                avatarMesh = avatarObject;
            } else {
                avatarObject.traverse((child) => {
                    if (child.type === 'Mesh' && child.material && child.material.map) {
                        avatarMesh = child;
                    }
                });
            }
            
            if (avatarMesh && avatarMesh.material) {
                // Create new texture from SVG
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 100;
                canvas.height = 160;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Render SVG to canvas
                const img = new Image();
                const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                
                img.onload = function() {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Create new texture and apply it
                    const newTexture = new THREE.CanvasTexture(canvas);
                    newTexture.needsUpdate = true;
                    newTexture.flipY = true;
                    
                    // Update material
                    if (Array.isArray(avatarMesh.material)) {
                        avatarMesh.material.forEach(mat => {
                            if (mat.map) {
                                mat.map = newTexture;
                                mat.needsUpdate = true;
                            }
                        });
                    } else {
                        avatarMesh.material.map = newTexture;
                        avatarMesh.material.needsUpdate = true;
                    }
                    
                    URL.revokeObjectURL(url);
                    console.log('✅ Updated avatar texture with new SVG');
                };
                
                img.src = url;
            }
        } catch (error) {
            console.error('❌ Error updating avatar texture:', error);
        }
    };
    
    console.log('✅ Replaced ContactCustomizationManager methods with SVG versions');
}

// Initialize avatar replacement system
function initializeAvatarReplacer() {
    console.log('🎨 Initializing SVG Avatar Replacer...');
    
    // Wait for HTML demo SVG engine to be loaded
    if (typeof generateAvatarSVG !== 'function') {
        console.warn('⚠️ HTML Demo SVG Engine not loaded yet, retrying in 100ms...');
        setTimeout(initializeAvatarReplacer, 100);
        return;
    }
    
    // Load saved avatar configurations on startup
    loadSavedAvatarConfigurations();
    
    // Replace avatar functions
    replaceGenerateContactAvatar();
    replaceUpdateContactAvatar();
    replaceAvatarGenerator();
    
    // Replace customization UI
    replaceContactCustomizationManager();
    
    // Add global functions for external use
    window.getContactAvatarConfig = getContactAvatarConfig;
    window.updateContactAvatarConfig = updateContactAvatarConfig;
    window.applyAvatarToThreeJSObject = applyAvatarToThreeJSObject;
    window.createSVGAvatarObject = createSVGAvatarObject;
    window.updateExploreAvatarFromSVG = updateExploreAvatarFromSVG;
    window.cleanupDuplicateAvatars = cleanupDuplicateAvatars;
    window.ensureContactAvatarExists = ensureContactAvatarExists;
    
    // Add global avatar management functions
    window.removeAllContactAvatars = function() {
        if (!window.app || !window.app.scene) return;
        
        console.log('🎨 Removing all contact avatars and preview avatars');
        const avatarsToRemove = [];
        
        window.app.scene.traverse((child) => {
            if (child.userData && child.userData.isAvatar) {
                // Remove all avatars except explore avatar during explore mode
                if (child.userData.parentContactId !== 'exploreAvatar' || 
                    !window.app.exploreMode) {
                    avatarsToRemove.push(child);
                }
            }
            
            // Also remove any objects that look like avatar previews at the origin
            if (child.isMesh && child.geometry && child.geometry.type === 'PlaneGeometry' &&
                Math.abs(child.position.x) < 0.1 && Math.abs(child.position.z) < 0.1 &&
                child.position.y < 2.0 && child.parent === window.app.scene) {
                console.log('🎨 Removing potential preview avatar at origin:', child.name || 'unnamed');
                avatarsToRemove.push(child);
            }
        });
        
        avatarsToRemove.forEach(avatar => {
            if (avatar.parent) {
                avatar.parent.remove(avatar);
            }
        });
        
        console.log(`✅ Removed ${avatarsToRemove.length} avatars and preview objects`);
    };
    
    // REMOVED: All cleanup functions that target polygons/planes
    // These were removing the green plane from the world when avatar customization occurred
    
    window.refreshAllContactAvatars = function() {
        console.log('🎨 Refreshing all contact avatars');
        
        // REMOVED: No cleanup functions - just refresh avatars
        
        // Remove all existing SVG avatars
        window.removeAllContactAvatars();
        
        // Recreate avatars for all contacts
        if (window.app && window.app.scene) {
            const contactIds = new Set();
            
            // Find all contact objects
            window.app.scene.traverse((child) => {
                if (child.userData && child.userData.subType === 'contact' && 
                    (child.userData.contactId || child.userData.fileId || child.userData.id)) {
                    const contactId = child.userData.contactId || child.userData.fileId || child.userData.id;
                    contactIds.add(contactId);
                }
            });
            
            // Create avatars for each contact
            contactIds.forEach(contactId => {
                const config = getContactAvatarConfig(contactId) || createDefaultAvatarConfig({});
                ensureContactAvatarExists(contactId, config);
            });
            
            console.log(`✅ Refreshed avatars for ${contactIds.size} contacts`);
        }
    };    console.log('✅ SVG Avatar Replacer initialized successfully');
}

// Listen for avatar configuration updates from UI
document.addEventListener('avatarConfigUpdated', function(event) {
    // Track when avatar config updates occur for cleanup protection
    window.lastAvatarConfigUpdate = Date.now();
    
    const { config, contactId: eventContactId } = event.detail;
    console.log('🎨 Avatar config updated from UI:', config);
    console.log('🎨 Event contactId:', eventContactId);
    
    // FIXED: Use event contactId first, then fallback to getCurrentActiveContactId()
    let currentContactId = eventContactId || getCurrentActiveContactId();
    
    console.log('🎨 Resolved contactId:', currentContactId, '(from event:', !!eventContactId, ', from active:', !eventContactId && !!getCurrentActiveContactId(), ')');
    
    // Also check if ContactCustomizationManager has a current contact (secondary fallback)
    if (!currentContactId && window.ContactCustomizationManager && window.ContactCustomizationManager.prototype) {
        // Try to find an active customization manager instance
        const instances = window.ContactCustomizationManager.instances || [];
        for (const instance of instances) {
            if (instance.currentContactId) {
                currentContactId = instance.currentContactId;
                console.log('🎨 Used fallback contactId from instance:', currentContactId);
                break;
            }
        }
    }
    
    // Don't fall back to explore avatar - if no contact ID, skip update
    if (!currentContactId) {
        console.warn('⚠️ No contact ID found for avatar update, skipping');
        return;
    }
    
    // The config from the event is the source of truth.
    const svgConfig = config;

    // Only allow explore avatar updates when explicitly requested
    if (currentContactId === 'exploreAvatar') {
        // FIXED: Handle explore avatar updates directly, don't skip due to throttling in Done button case
        const now = Date.now();
        if (event.detail.isDoneButton || (!window.lastExploreAvatarUpdate || (now - window.lastExploreAvatarUpdate) > 2000)) {
            window.lastExploreAvatarUpdate = now;
            
            console.log('🎨 ✅ EXPLORE AVATAR: Processing update (Done button or throttle passed)');
            console.log('🎨 ✅ EXPLORE AVATAR: Config being saved:', JSON.stringify(svgConfig));
            
            // Update explore avatar configuration
            updateContactAvatarConfig(currentContactId, svgConfig);
            
            // Update explore avatar if active
            if (window.ExploreAvatarCustomizationManager && window.ExploreAvatarCustomizationManager.instance) {
                // Save the config to explore avatar manager
                // The config is already in SVG format, so we need to convert it to 3D for the manager
                const config3D = convertSVGConfigTo3DConfig(svgConfig);
                if (window.ExploreAvatarCustomizationManager.instance.saveExploreAvatarCustomization) {
                    window.ExploreAvatarCustomizationManager.instance.saveExploreAvatarCustomization(config3D);
                    console.log('🎨 ✅ Saved explore avatar config to manager (converted to 3D).');
                } else {
                    console.error('🎨 ❌ saveExploreAvatarCustomization method not found on ExploreAvatarCustomizationManager');
                }
                
                // Ask manager to rebuild avatar if needed
                window.ExploreAvatarCustomizationManager.instance.updateExploreAvatar?.();
            }
            
            console.log('🎨 Updated explore avatar config from UI (throttled to 2s)');
        } else {
            console.log('🎨 Skipping explore avatar update - too frequent (preventing flash)');
        }
        return;
    }
    
    if (currentContactId) {
        console.log('🎨 SVG Customization: Updating avatar for contact', currentContactId);
        
        // Update the stored configuration
        updateContactAvatarConfig(currentContactId, svgConfig);
        
        // Convert back to 3D format for persistence
        const config3D = convertSVGConfigTo3DConfig(svgConfig);
        console.log('🎨 Converted to 3D config for persistence:', config3D);
        
        // Save via existing ContactCustomizationManager for proper persistence
        if (window.ContactCustomizationManager && window.ContactCustomizationManager.instance) {
            window.ContactCustomizationManager.instance.saveContactCustomization(currentContactId, config3D);
            console.log('🎨 Saved via existing ContactCustomizationManager:', currentContactId);
        }
        
        // Update currentAvatarConfig for ContactCustomizationManager
        window.currentAvatarConfig = svgConfig;
        
        // Find and update the ContactCustomizationManager instance
        if (window.ContactCustomizationManager) {
            const instances = window.ContactCustomizationManager.instances || [];
            let instanceFound = false;
            for (const instance of instances) {
                if (instance.currentContactId === currentContactId) {
                    // Trigger the avatar update
                    instance.updateContactAvatar(currentContactId);
                    console.log('✅ Triggered avatar update via ContactCustomizationManager for:', currentContactId);
                    instanceFound = true;
                    break;
                }
            }
            
            // If no specific instance found, create a direct update via SVG system
            if (!instanceFound && window.app && window.app.scene) {
                console.log('🎨 SVG Avatar Replacer: Updating avatar for', currentContactId);
                
                // Generate new SVG content
                const svgContent = generateAvatarSVG(svgConfig);
                console.log('Generated SVG for contact', currentContactId, '- length:', svgContent.length);
                console.log('🎨 Generated new SVG for contact', currentContactId, 'length:', svgContent.length);
                
                // If this is the explore avatar, use the dedicated update function
                if (currentContactId === 'exploreAvatar' || currentContactId === 'EXPLORE_AVATAR') {
                    console.log('🎨 Using dedicated explore avatar update path.');
                    if (typeof window.updateExploreAvatarFromSVG === 'function') {
                        window.updateExploreAvatarFromSVG(svgContent);
                    }
                    return; // Stop here for explore avatar
                }

                // Remove old avatar
                console.log('🎨 Removing old child avatar for contact', currentContactId);
                if (window.app && window.app.scene) {
                    window.app.scene.traverse((child) => {
                        if (child.userData && String(child.userData.parentContactId) === String(currentContactId) && 
                            child.userData.isAvatar && child.parent) {
                            child.parent.remove(child);
                        }
                    });
                }
                
                // Find contact object and add new avatar
                let avatarUpdated = false;
                window.app.scene.traverse((contactObject) => {
                    if (contactObject.userData && 
                        (String(contactObject.userData.contactId) === String(currentContactId) || 
                         String(contactObject.userData.fileId) === String(currentContactId) ||
                         String(contactObject.userData.id) === String(currentContactId))) {
                        
                        console.log('🎨 Found contact object for', currentContactId, 'adding new avatar');
                        const newAvatar = createSVGAvatarObject(svgContent, currentContactId);
                        newAvatar.position.set(0, 0, 0); // Relative to contact object center
                        contactObject.add(newAvatar);
                        avatarUpdated = true;
                        console.log('✅ Added updated SVG avatar to contact object:', currentContactId);
                    }
                });
                
                if (!avatarUpdated) {
                    console.warn('⚠️ Could not find contact object for', currentContactId, 'to update avatar');
                }
            }
        }
        
        console.log('🎨 Updated avatar config from UI for contact:', currentContactId);
    } else {
        console.warn('🎨 No active contact ID found for avatar config update');
    }
});

// Helper function to get current active contact ID (will be connected to existing systems)
function getCurrentActiveContactId() {
    // First check ContactCustomizationManager instances for current contact
    if (window.ContactCustomizationManager) {
        const instances = window.ContactCustomizationManager.instances || [];
        for (const instance of instances) {
            if (instance.currentContactId) {
                return instance.currentContactId;
            }
        }
        
        // Also check the prototype's instance if it exists
        if (window.ContactCustomizationManager.prototype && window.ContactCustomizationManager.prototype.currentContactId) {
            return window.ContactCustomizationManager.prototype.currentContactId;
        }
    }
    
    // Check for a global current contact ID
    if (window.currentActiveContactId) {
        return window.currentActiveContactId;
    }
    
    // Check if we're customizing the explore avatar (only as fallback)
    if (window.ExploreAvatarCustomizationManager && window.ExploreAvatarCustomizationManager.instance) {
        const menu = document.getElementById('avatar-customization-menu');
        if (menu && menu.style.display !== 'none' && menu.dataset.contactId === 'exploreAvatar') {
            return 'exploreAvatar';
        }
    }
    
    // This will be connected to existing contact management systems
    // For now, return a placeholder
    if (typeof getCurrentContact === 'function') {
        const contact = getCurrentContact();
        return contact ? contact.id : null;
    }
    return null;
}

// Function to clean up duplicate avatars
function cleanupDuplicateAvatars(contactId) {
    if (!window.app || !window.app.scene) return;
    
    console.log('🎨 Cleaning up duplicate avatars for contact:', contactId);
    
    let avatarsFound = 0;
    const avatarsToRemove = [];
    
    // Find all avatars for this contact
    window.app.scene.traverse((child) => {
        if (child.userData && child.userData.parentContactId === contactId && child.userData.isAvatar) {
            avatarsFound++;
            if (avatarsFound > 1) {
                // Keep only the first one, mark others for removal
                avatarsToRemove.push(child);
            }
        }
    });
    
    // Remove duplicate avatars
    avatarsToRemove.forEach(avatar => {
        if (avatar.parent) {
            avatar.parent.remove(avatar);
            console.log('🎨 Removed duplicate avatar for contact:', contactId);
        }
    });
    
    if (avatarsToRemove.length > 0) {
        console.log(`✅ Cleaned up ${avatarsToRemove.length} duplicate avatars for contact:`, contactId);
    }
}

// Function to ensure contact has only one properly positioned avatar
function ensureContactAvatarExists(contactId, config) {
    if (!window.app || !window.app.scene) return false;
    
    console.log('🎨 Ensuring avatar exists for contact:', contactId);
    
    // Clean up duplicates first
    cleanupDuplicateAvatars(contactId);
    
    // Check if avatar already exists
    let hasAvatar = false;
    window.app.scene.traverse((child) => {
        if (child.userData && child.userData.parentContactId === contactId && child.userData.isAvatar) {
            hasAvatar = true;
        }
    });
    
    if (hasAvatar) {
        console.log('🎨 Avatar already exists for contact:', contactId);
        return true;
    }
    
    // Create new avatar if needed
    const svgContent = generateAvatarSVG(config || createDefaultAvatarConfig({}));
    let avatarCreated = false;
    
    // Find contact object and add avatar
    window.app.scene.traverse((contactObject) => {
        if (contactObject.userData && 
            (contactObject.userData.contactId === contactId || 
             contactObject.userData.fileId === contactId ||
             contactObject.userData.id === contactId)) {
            
            console.log('🎨 Creating new avatar for contact:', contactId);
            const newAvatar = createSVGAvatarObject(svgContent, contactId);
            newAvatar.position.set(0, 0, 0);
            contactObject.add(newAvatar);
            avatarCreated = true;
            console.log('✅ Created new avatar for contact:', contactId);
        }
    });
    
    return avatarCreated;
}

// Load saved avatar configurations from the existing persistence system
function loadSavedAvatarConfigurations() {
    console.log('🎨 Loading saved avatar configurations...');
    
    // Wait for ContactCustomizationManager to be available
    if (!window.ContactCustomizationManager || !window.ContactCustomizationManager.instance) {
        console.log('🎨 ContactCustomizationManager not ready, retrying...');
        setTimeout(loadSavedAvatarConfigurations, 500);
        return;
    }
    
    try {
        // Get the existing customization data from ContactCustomizationManager
        const customizationManager = window.ContactCustomizationManager.instance;
        
        // Check if manager has loadCustomizations method and call it
        if (typeof customizationManager.loadCustomizations === 'function') {
            customizationManager.loadCustomizations();
            console.log('🎨 Triggered loadCustomizations on ContactCustomizationManager');
        }
        
        // Also check if there's stored data we can access directly
        if (customizationManager.customizationData && customizationManager.customizationData.size > 0) {
            // Convert existing 3D configs to SVG configs and store in our map
            customizationManager.customizationData.forEach((config3D, contactId) => {
                console.log('🎨 Converting saved config for contact:', contactId, config3D);
                
                // Convert from 3D format to SVG format
                const svgConfig = convert3DConfigToSVGConfig(config3D);
                contactAvatarConfigs.set(contactId, svgConfig);
                
                console.log('🎨 Loaded saved config for contact:', contactId);
            });
            
            console.log(`🎨 ✅ Loaded ${contactAvatarConfigs.size} saved avatar configurations`);
        } else {
            console.log('🎨 No existing avatar configurations found');
        }
        
        // Try to apply all saved avatars if the system is available
        // DISABLED: We don't want to apply 3D avatars since we use SVG avatars
        setTimeout(() => {
            // Skip applying saved avatars - we handle SVG avatar updates directly
            console.log('🎨 Skipping applyAllSavedAvatars - using SVG avatar system instead');
            /*
            if (typeof customizationManager.applyAllSavedAvatars === 'function') {
                customizationManager.applyAllSavedAvatars();
                console.log('🎨 Applied all saved avatars');
            }
            */
        }, 1000);
        
    } catch (error) {
        console.error('🎨 Error loading saved avatar configurations:', error);
    }
}

// Auto-initialize when this script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAvatarReplacer);
} else {
    // DOM already loaded
    setTimeout(initializeAvatarReplacer, 50);
}

console.log('✅ SVG Avatar Replacer loaded - Simple direct replacement');
