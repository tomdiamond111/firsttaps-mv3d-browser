// ============================================================================
// HTML DEMO CUSTOMIZATION UI - EXACT COPY FROM svg_avatar_demo_v2BACKUP4.html
// ============================================================================

// CRITICAL: This is an EXACT copy of the HTML demo UI structure and event handling
// DO NOT MODIFY until basic functionality works exactly like the demo

// Current avatar configuration (will be synced with the HTML demo engine)
let currentAvatarConfig = {
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

// HTML structure for avatar customization (EXACT COPY from demo)
function createAvatarCustomizationHTML() {
    return `
        <div class="avatar-customization-container">
            <div class="avatar-preview-section">
                <div class="avatar-preview">
                    <div class="avatar-svg" id="current-avatar-preview">
                        <!-- Live SVG preview will be inserted here -->
                    </div>
                    <div class="avatar-title">Live Preview</div>
                    <div class="avatar-description">Updates as you customize</div>
                </div>
            </div>
            <div class="controls">
                <div class="control-group">
                    <label>Gender:</label>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('gender', 'male')" class="active" id="gender-male">Male</button>
                        <button onclick="updateAvatarConfig('gender', 'female')" id="gender-female">Female</button>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>Face Shape:</label>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('faceShape', 'oval')" class="active" id="face-oval">Oval</button>
                        <button onclick="updateAvatarConfig('faceShape', 'round')" id="face-round">Round</button>
                        <button onclick="updateAvatarConfig('faceShape', 'square')" id="face-square">Square</button>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>Skin Tone:</label>
                    <div class="color-picker">
                        <div class="color-swatch active" style="background-color: #FDBCB4" onclick="updateAvatarConfig('skinTone', '#FDBCB4')" data-tone="light"></div>
                        <div class="color-swatch" style="background-color: #E0AC69" onclick="updateAvatarConfig('skinTone', '#E0AC69')" data-tone="medium"></div>
                        <div class="color-swatch" style="background-color: #C68642" onclick="updateAvatarConfig('skinTone', '#C68642')" data-tone="tan"></div>
                        <div class="color-swatch" style="background-color: #8D5524" onclick="updateAvatarConfig('skinTone', '#8D5524')" data-tone="dark"></div>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>Hair Style:</label>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('hairStyle', 'short')" class="active" id="hair-short">Short</button>
                        <button onclick="updateAvatarConfig('hairStyle', 'medium')" id="hair-medium">Medium</button>
                        <button onclick="updateAvatarConfig('hairStyle', 'long')" id="hair-long">Long</button>
                        <button onclick="updateAvatarConfig('hairStyle', 'bald')" id="hair-bald">Bald</button>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>Hair Color:</label>
                    <div class="color-picker">
                        <div class="color-swatch active" style="background-color: #8B4513" onclick="updateAvatarConfig('hairColor', '#8B4513')" data-color="brown"></div>
                        <div class="color-swatch" style="background-color: #FFD700" onclick="updateAvatarConfig('hairColor', '#FFD700')" data-color="blonde"></div>
                        <div class="color-swatch" style="background-color: #000000" onclick="updateAvatarConfig('hairColor', '#000000')" data-color="black"></div>
                        <div class="color-swatch" style="background-color: #B22222" onclick="updateAvatarConfig('hairColor', '#B22222')" data-color="red"></div>
                        <div class="color-swatch" style="background-color: #808080" onclick="updateAvatarConfig('hairColor', '#808080')" data-color="gray"></div>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>Facial Hair (Men Only):</label>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('beard', false)" class="active" id="beard-none">No Beard</button>
                        <button onclick="updateAvatarConfig('beard', true)" id="beard-yes">Beard</button>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>Eye Shape:</label>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('eyeShape', 'almond')" class="active" id="eye-almond">Almond</button>
                        <button onclick="updateAvatarConfig('eyeShape', 'round')" id="eye-round">Round</button>
                        <button onclick="updateAvatarConfig('eyeShape', 'narrow')" id="eye-narrow">Narrow</button>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>Eye Color:</label>
                    <div class="color-picker">
                        <div class="color-swatch active" style="background-color: #4169E1" onclick="updateAvatarConfig('eyeColor', '#4169E1')" data-color="blue"></div>
                        <div class="color-swatch" style="background-color: #8B4513" onclick="updateAvatarConfig('eyeColor', '#8B4513')" data-color="brown"></div>
                        <div class="color-swatch" style="background-color: #228B22" onclick="updateAvatarConfig('eyeColor', '#228B22')" data-color="green"></div>
                        <div class="color-swatch" style="background-color: #708090" onclick="updateAvatarConfig('eyeColor', '#708090')" data-color="gray"></div>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>👔 Clothing:</label>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('clothing', 'business')" class="active" id="clothing-business">Business</button>
                        <button onclick="updateAvatarConfig('clothing', 'medical')" id="clothing-medical">Medical</button>
                        <button onclick="updateAvatarConfig('clothing', 'casual')" id="clothing-casual">Casual</button>
                        <button onclick="updateAvatarConfig('clothing', 'formal')" id="clothing-formal">Formal</button>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>🔧 Accessories:</label>
                    <div class="control-row">
                        <button onclick="toggleAvatarAccessory('glasses')" id="acc-glasses">👓 Glasses</button>
                        <button onclick="toggleAvatarAccessory('hat')" id="acc-hat">🎩 Hat</button>
                        <button onclick="toggleAvatarAccessory('stethoscope')" id="acc-stethoscope">🩺 Stethoscope</button>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>👔 Clothing Style:</label>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('clothingStyle', 'pants')" class="active" id="clothing-pants">Pants</button>
                        <button onclick="updateAvatarConfig('clothingStyle', 'shorts')" id="clothing-shorts">Shorts</button>
                        <button onclick="updateAvatarConfig('clothingStyle', 'dress')" id="clothing-dress">Dress</button>
                        <button onclick="updateAvatarConfig('clothingStyle', 'skirt')" id="clothing-skirt">Skirt</button>
                    </div>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('sleeveStyle', 'short')" class="active" id="sleeve-short">Short Sleeve</button>
                        <button onclick="updateAvatarConfig('sleeveStyle', 'long')" id="sleeve-long">Long Sleeve</button>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>Clothing Colors:</label>
                    <div class="control-row">
                        <div class="color-swatch" style="background-color: #FFFFFF; border: 1px solid #ccc" onclick="updateAvatarConfig('clothingColor', '#FFFFFF')" data-color="white"></div>
                        <div class="color-swatch" style="background-color: #000000" onclick="updateAvatarConfig('clothingColor', '#000000')" data-color="black"></div>
                        <div class="color-swatch" style="background-color: #808080" onclick="updateAvatarConfig('clothingColor', '#808080')" data-color="gray"></div>
                        <div class="color-swatch active" style="background-color: #4169E1" onclick="updateAvatarConfig('clothingColor', '#4169E1')" data-color="blue"></div>
                        <div class="color-swatch" style="background-color: #DC143C" onclick="updateAvatarConfig('clothingColor', '#DC143C')" data-color="red"></div>
                        <div class="color-swatch" style="background-color: #228B22" onclick="updateAvatarConfig('clothingColor', '#228B22')" data-color="green"></div>
                        <div class="color-swatch" style="background-color: #FFD700" onclick="updateAvatarConfig('clothingColor', '#FFD700')" data-color="yellow"></div>
                    </div>
                </div>
                
                <div class="control-group">
                    <label>🎭 Themes & Styles:</label>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('theme', 'hawaiian')" id="theme-hawaiian">🏖️ Hawaiian</button>
                        <button onclick="updateAvatarConfig('theme', 'businessCasual')" id="theme-business">💼 Business</button>
                        <button onclick="updateAvatarConfig('theme', 'fancyNight')" id="theme-fancy">🎩 Fancy Night</button>
                    </div>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('theme', 'workout')" id="theme-workout">💪 Workout</button>
                        <button onclick="updateAvatarConfig('theme', 'doctor')" id="theme-doctor">👩‍⚕️ Doctor</button>
                        <button onclick="updateAvatarConfig('theme', 'farmer')" id="theme-farmer">👨‍🌾 Farmer</button>
                        <button onclick="updateAvatarConfig('theme', 'teacher')" id="theme-teacher">👩‍🏫 Teacher</button>
                    </div>
                    <div class="control-row">
                        <button onclick="updateAvatarConfig('theme', '')" id="theme-none">🚫 No Theme</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// CSS Styles for avatar customization (EXACT COPY from demo)
function createAvatarCustomizationCSS() {
    return `
        <style>
        .avatar-customization-container {
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            display: flex;
            gap: 20px;
        }
        
        .avatar-preview-section {
            min-width: 200px;
            text-align: center;
        }
        
        .avatar-preview {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .avatar-svg {
            width: 150px;
            height: 240px;
            margin: 0 auto 15px auto;
            border: 2px solid #4a90e2;
            border-radius: 10px;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .avatar-svg svg {
            max-width: 100%;
            max-height: 100%;
        }
        
        .avatar-title {
            font-weight: bold;
            color: #4a90e2;
            margin-bottom: 5px;
        }
        
        .avatar-description {
            font-size: 12px;
            color: #ccc;
        }
        
        .controls {
            background: rgba(0,0,0,0.8);
            padding: 25px;
            border-radius: 15px;
            min-width: 300px;
            max-height: 80vh;
            overflow-y: auto;
            flex: 1;
        }
        
        .control-group {
            margin-bottom: 25px;
        }
        
        .control-group label {
            display: block;
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 16px;
            color: #fff;
        }
        
        .control-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
        }
        
        button {
            background: #4a90e2;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 12px;
            min-width: 80px;
        }
        
        button:hover {
            background: #357abd;
            transform: translateY(-2px);
        }
        
        button.active {
            background: #2ecc71;
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
        }
        
        .color-picker {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .color-swatch {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            cursor: pointer;
            border: 3px solid transparent;
            transition: all 0.2s;
        }
        
        .color-swatch:hover {
            transform: scale(1.1);
        }
        
        .color-swatch.active {
            border-color: #fff;
            box-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        </style>
    `;
}

// Update avatar configuration (EXACT COPY from demo logic)
function updateAvatarConfig(property, value) {
    console.log(`🔧 updateAvatarConfig called: ${property} = ${value}`);
    currentAvatarConfig[property] = value;
    
    // Update button states
    updateAvatarButtonStates(property, value);
    
    // Update color swatch states
    if (property === 'skinTone' || property === 'hairColor' || property === 'eyeColor' || property === 'clothingColor') {
        updateAvatarColorSwatchStates(property, value);
    }
    
    // Update theme button states
    if (property === 'theme') {
        updateAvatarThemeButtonStates(value);
    }
    
    // Show/hide beard controls based on gender
    if (property === 'gender') {
        const beardGroups = document.querySelectorAll('.control-group');
        beardGroups.forEach(group => {
            const label = group.querySelector('label');
            if (label && label.textContent.includes('Facial Hair')) {
                if (value === 'female') {
                    group.style.display = 'none';
                    currentAvatarConfig.beard = false;
                } else {
                    group.style.display = 'block';
                }
            }
        });
    }
    
    // Trigger avatar regeneration (will be connected to SVG engine)
    console.log(`🎯 About to trigger avatar update for ${property}`);
    triggerAvatarUpdate();
    
    console.log('Updated avatar config:', property, '=', value);
}

// Toggle accessory (EXACT COPY from demo logic)
function toggleAvatarAccessory(accessory) {
    const index = currentAvatarConfig.accessories.indexOf(accessory);
    if (index > -1) {
        currentAvatarConfig.accessories.splice(index, 1);
        const button = document.getElementById(`acc-${accessory}`);
        if (button) button.classList.remove('active');
    } else {
        currentAvatarConfig.accessories.push(accessory);
        const button = document.getElementById(`acc-${accessory}`);
        if (button) button.classList.add('active');
    }
    
    // Trigger avatar regeneration
    triggerAvatarUpdate();
}

// Update button states (EXACT COPY from demo logic)
function updateAvatarButtonStates(property, value) {
    // Remove active class from all buttons in the group
    const prefix = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    document.querySelectorAll(`[id^="${prefix.split('-')[0]}-"]`).forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected button
    const buttonId = `${prefix.split('-')[0]}-${value === true ? 'yes' : value === false ? 'none' : value}`;
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.add('active');
    }
}

// Update color swatch states (EXACT COPY from demo logic)
function updateAvatarColorSwatchStates(property, value) {
    // Find all color swatches in the document
    const allSwatches = document.querySelectorAll('.color-swatch');
    
    // Remove active class from swatches that match this color
    allSwatches.forEach(swatch => {
        if (swatch.style.backgroundColor === value || 
            swatch.style.backgroundColor === value.toLowerCase() ||
            swatch.getAttribute('onclick') && swatch.getAttribute('onclick').includes(value)) {
            swatch.classList.add('active');
        } else if (swatch.getAttribute('onclick') && swatch.getAttribute('onclick').includes(property)) {
            swatch.classList.remove('active');
        }
    });
}

// Update theme button states (EXACT COPY from demo logic)
function updateAvatarThemeButtonStates(value) {
    // Remove active class from all theme buttons
    document.querySelectorAll('[id^="theme-"]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected theme button
    const buttonId = `theme-${value || 'none'}`;
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.add('active');
    }
}

// Trigger avatar update (will be connected to SVG engine and Three.js integration)
function triggerAvatarUpdate() {
    // AGGRESSIVE DEBOUNCE: Prevent excessive updates during UI interaction
    if (window.avatarUpdateTimeout) {
        clearTimeout(window.avatarUpdateTimeout);
    }
    
    window.avatarUpdateTimeout = setTimeout(() => {
        performAvatarUpdate();
    }, 100); // Reduced to 100ms debounce for more responsive individual updates
}

// Perform the actual avatar update (separated for debouncing)
function performAvatarUpdate() {
    // This will be connected to the SVG generation and Three.js avatar display
    console.log('🎨 Avatar update triggered with config:', currentAvatarConfig);
    
    // If generateAvatarSVG function is available, use it
    if (typeof generateAvatarSVG === 'function') {
        const svgContent = generateAvatarSVG(currentAvatarConfig);
        console.log('Generated SVG content:', svgContent.substring(0, 100) + '...');
        
        // Update the live preview
        const previewElement = document.getElementById('current-avatar-preview');
        if (previewElement) {
            previewElement.innerHTML = svgContent;
            console.log('✅ Updated live preview with new SVG');
        }
        
        // Dispatch custom event for Three.js integration
        const event = new CustomEvent('avatarConfigUpdated', {
            detail: {
                config: currentAvatarConfig,
                svgContent: svgContent
            }
        });
        document.dispatchEvent(event);
        
        // Also trigger the Three.js avatar update directly if available
        if (window.createSVGAvatarObject) {
            console.log('🎨 Creating Three.js avatar object...');
            try {
                const avatarObject = window.createSVGAvatarObject(svgContent, 'customization-preview');
                console.log('✅ Three.js avatar object created successfully');
                
                // DO NOT add preview avatars to the main scene - they should only exist in the UI
                // The preview avatar will be handled by the UI canvas/preview system
                // If we're in a customization context, DO NOT update the main scene
                
                // REMOVED: Preview avatar cleanup that was incorrectly removing the green plane
            } catch (error) {
                console.error('❌ Error creating Three.js avatar:', error);
            }
        }
    } else {
        console.error('❌ generateAvatarSVG function not available!');
    }
}

// Initialize customization UI (will be called from integration layer)
function initializeAvatarCustomizationUI(container) {
    console.log('🎨 Initializing Avatar Customization UI - EXACT COPY from demo');
    
    // Add CSS styles
    const styleElement = document.createElement('div');
    styleElement.innerHTML = createAvatarCustomizationCSS();
    document.head.appendChild(styleElement.querySelector('style'));
    
    // Add HTML structure
    container.innerHTML = createAvatarCustomizationHTML();
    
    // Initialize button states
    updateAvatarButtonStates('gender', currentAvatarConfig.gender);
    updateAvatarButtonStates('faceShape', currentAvatarConfig.faceShape);
    updateAvatarColorSwatchStates('skinTone', currentAvatarConfig.skinTone);
    updateAvatarButtonStates('hairStyle', currentAvatarConfig.hairStyle);
    updateAvatarColorSwatchStates('hairColor', currentAvatarConfig.hairColor);
    updateAvatarButtonStates('beard', currentAvatarConfig.beard);
    updateAvatarButtonStates('eyeShape', currentAvatarConfig.eyeShape);
    updateAvatarColorSwatchStates('eyeColor', currentAvatarConfig.eyeColor);
    updateAvatarButtonStates('clothing', currentAvatarConfig.clothing);
    updateAvatarButtonStates('clothingStyle', currentAvatarConfig.clothingStyle);
    updateAvatarColorSwatchStates('clothingColor', currentAvatarConfig.clothingColor);
    updateAvatarButtonStates('sleeveStyle', currentAvatarConfig.sleeveStyle);
    updateAvatarThemeButtonStates(currentAvatarConfig.theme);
    
    // Generate initial preview
    setTimeout(() => {
        triggerAvatarUpdate();
        console.log('✅ Initial avatar preview generated');
    }, 100);
    
    console.log('✅ Avatar Customization UI initialized with live preview and exact demo structure');
}

// Make functions globally available for onclick handlers
window.updateAvatarConfig = updateAvatarConfig;
window.toggleAvatarAccessory = toggleAvatarAccessory;

console.log('✅ HTML Demo Customization UI loaded - EXACT COPY from demo');
