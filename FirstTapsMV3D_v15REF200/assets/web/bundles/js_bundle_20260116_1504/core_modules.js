/**
 * FURNITURE IDLE ANIMATIONS MODULE
 * Handles visual effects for furniture when NOT in playback mode
 * 
 * Features:
 * - Riser: Blue wave flowing across tiers (choir voices rising)
 * - Gallery Wall: Red/pink heartbeat pulse (creative energy)
 * - Stage: Golden spotlight sweep (stage lights during sound check)
 * - Amphitheatre: Rainbow aurora wave (ethereal northern lights)
 * 
 * Design Philosophy:
 * - Subtle but noticeable attraction mode
 * - Preserves furniture material/color differentiation
 * - Performance-friendly (simple material property animations)
 * - Auto-stops during playback
 */

(function() {
    'use strict';
    
    console.log('ðŸ”´ðŸ”´ðŸ”´ ANIMATION MODULE IIFE STARTED ðŸ”´ðŸ”´ðŸ”´');

    console.log('ðŸŽ¨ Loading Furniture Idle Animations Module...');
    console.log('ðŸŽ¨ THREE.js available:', typeof window.THREE !== 'undefined');
    console.log('ðŸŽ¨ FURNITURE_TYPES available:', typeof window.FURNITURE_TYPES !== 'undefined');
    
    console.log('ðŸ”´ About to define FurnitureIdleAnimationManager class...');

    // ============================================================================
    // FURNITURE IDLE ANIMATION MANAGER
    // ============================================================================
    
    class FurnitureIdleAnimationManager {
        constructor() {
            this.THREE = window.THREE;
            this.isEnabled = true; // Re-enabled with proper material preservation
            
            // Animation state tracking
            this.animationStates = new Map(); // furnitureId -> { startTime, isActive }
            
            // Material preservation: store original material properties per mesh
            this.originalMaterials = new Map(); // meshId -> { emissive: Color, emissiveIntensity: number, material: Material }
            
            // Spotlight geometry tracking for stage animations
            this.spotlightGeometry = new Map(); // furnitureId -> [spotlight meshes]
            
            // Animation parameters (can be tweaked for different effects)
            this.params = {
                riser: {
                    glowColor: 0x4A90E2,        // Blue
                    maxIntensity: 0.8,          // Strong glow for visibility
                    waveSpeed: 2.0,              // seconds per wave
                    tierStagger: 0.3,            // delay between tiers
                    cyclePeriod: 4.0             // pause between waves
                },
                bookshelf: {
                    pulseSpeed: 2.0,             // seconds per color cycle
                    maxIntensity: 2.0,           // Match amphitheatre brightness
                    breatheScale: 0.015          // Breathing effect
                },
                gallery_wall: {
                    pulseSpeed: 2.0,             // seconds per color cycle
                    maxIntensity: 2.0,           // Match amphitheatre brightness
                    breatheScale: 0.015          // Breathing effect
                },
                stage_small: {
                    ambientColor: 0x6B2FFF,      // Deep purple ambient
                    spotColor: 0xFFFACD,         // Lemon chiffon (warm white/yellow)
                    ambientIntensity: 0.3,       // Dim ambient for contrast
                    spotIntensity: 1.2,          // Bright spotlight
                    pulseSpeed: 4.0,             // Slow breathing pulse
                    sweepSpeed: 6.0,             // Moderate spotlight movement
                    numSpotlights: 3,            // Three crossing spots
                    spotRadius: 1.5              // Spotlight circle size
                },
                stage_large: {
                    ambientColor: 0x6B2FFF,      // Deep purple ambient
                    spotColor: 0xFFFACD,         // Lemon chiffon (warm white/yellow)
                    ambientIntensity: 0.3,       // Dim ambient for contrast
                    spotIntensity: 2.5,          // VERY bright spotlights
                    pulseSpeed: 4.0,             // Slow breathing pulse
                    sweepSpeed: 6.0,             // Slower sweep for large stage
                    numSpotlights: 3             // Three roving spots
                },
                amphitheatre: {
                    minIntensity: 0.6,           // Strong base glow
                    maxIntensity: 1.2,           // Bright shimmer peak
                    rainbowSpeed: 5.0,           // seconds per full rainbow
                    hueOffset: 72,               // degrees per tier (360/5)
                    saturation: 0.7,             // Rainbow saturation (0-1)
                    lightness: 0.5               // Rainbow lightness (0-1)
                }
            };
            
            console.log('ðŸŽ¨ Furniture Idle Animation Manager initialized (with material preservation)');
        }
        
        /**
         * Preserve original material properties before animating
         */
        preserveMaterial(mesh) {
            if (!mesh || !mesh.material || !mesh.uuid) return;
            
            if (!this.originalMaterials.has(mesh.uuid)) {
                // Clone the material so this mesh has its own instance
                const originalMat = mesh.material;
                const clonedMat = originalMat.clone();
                
                // Store the original emissive properties
                this.originalMaterials.set(mesh.uuid, {
                    emissive: originalMat.emissive.clone(),
                    emissiveIntensity: originalMat.emissiveIntensity,
                    material: clonedMat
                });
                
                // Assign the cloned material to the mesh
                mesh.material = clonedMat;
            }
        }
        
        /**
         * Restore original material properties
         */
        restoreMaterial(mesh) {
            if (!mesh || !mesh.uuid) return;
            
            const original = this.originalMaterials.get(mesh.uuid);
            if (original && mesh.material) {
                mesh.material.emissive.copy(original.emissive);
                mesh.material.emissiveIntensity = original.emissiveIntensity;
            }
        }
        
        /**
         * Stop animation for a furniture piece and restore materials
         */
        stopAnimation(furnitureId, visualManager) {
            this.animationStates.delete(furnitureId);
            
            // Clean up spotlight geometry if exists
            const spotlights = this.spotlightGeometry.get(furnitureId);
            if (spotlights && window.scene) {
                spotlights.forEach(spotlight => {
                    window.scene.remove(spotlight);
                    if (spotlight.geometry) spotlight.geometry.dispose();
                    if (spotlight.material) spotlight.material.dispose();
                });
                this.spotlightGeometry.delete(furnitureId);
            }
            
            // Restore all materials for this furniture
            const visualElements = visualManager.furnitureMeshes.get(furnitureId);
            if (visualElements && visualElements.structure) {
                visualElements.structure.forEach(mesh => {
                    this.restoreMaterial(mesh);
                });
            }
        }

        /**
         * Main update function - called from main animation loop
         * Updates all non-playing furniture
         */
        updateAllAnimations(visualManager, timestamp) {
            if (!this.isEnabled) {
                console.log('ðŸŽ¨ [IDLE-ANIM] Animations disabled');
                return;
            }
            if (!visualManager || !visualManager.activeFurniture || !visualManager.furnitureMeshes) {
                console.log('ðŸŽ¨ [IDLE-ANIM] visualManager missing:', !!visualManager, !!(visualManager && visualManager.activeFurniture), !!(visualManager && visualManager.furnitureMeshes));
                return;
            }
            
            // Log every 300 frames (~5 seconds at 60fps)
            if (!this._frameCount) this._frameCount = 0;
            this._frameCount++;
            
            if (this._frameCount % 300 === 0) {
                console.log(`ðŸŽ¨ [IDLE-ANIM] Updating ${visualManager.activeFurniture.size} furniture pieces`);
            }
            
            visualManager.activeFurniture.forEach((furniture, furnitureId) => {
                // Skip if furniture is currently playing
                if (furniture.isPlaying) {
                    this.stopAnimation(furnitureId, visualManager);
                    return;
                }
                
                // Update idle animation
                this.updateFurnitureAnimation(furnitureId, furniture, visualManager, timestamp);
            });
        }

        /**
         * Update animation for a single furniture piece
         */
        updateFurnitureAnimation(furnitureId, furniture, visualManager, timestamp) {
            const visualElements = visualManager.furnitureMeshes.get(furnitureId);
            if (!visualElements || !visualElements.structure || !visualElements.structure.length) return;
            
            const time = timestamp * 0.001; // Convert to seconds
            
            // Ensure animation state exists
            if (!this.animationStates.has(furnitureId)) {
                this.animationStates.set(furnitureId, {
                    startTime: time,
                    isActive: true
                });
                console.log(`ðŸŽ¨ [IDLE-ANIM] Created animation state for ${furnitureId}`);
                console.log(`   Type: ${furniture.type}`);
                console.log(`   Name: ${furniture.name}`);
                console.log(`   Structure count: ${visualElements.structure.length}`);
                
                // Preserve materials for all structure meshes
                visualElements.structure.forEach(mesh => this.preserveMaterial(mesh));
            }
            
            // Route to type-specific animation
            // DEBUG: Log type for stages
            if (furniture.type && (furniture.type.includes('stage') || furniture.type.includes('Stage'))) {
                console.log(`ðŸŽ¨ [STAGE-DEBUG] Furniture type: "${furniture.type}" for ${furnitureId}`);
                console.log(`ðŸŽ¨ [STAGE-DEBUG] FURNITURE_TYPES.STAGE_SMALL: "${window.FURNITURE_TYPES?.STAGE_SMALL}"`);
                console.log(`ðŸŽ¨ [STAGE-DEBUG] FURNITURE_TYPES.STAGE_LARGE: "${window.FURNITURE_TYPES?.STAGE_LARGE}"`);
            }
            
            switch(furniture.type) {
                case window.FURNITURE_TYPES.RISER:
                    this.animateRiserWave(visualElements.structure, time, this.params.riser);
                    break;
                
                case 'bookshelf':  // Bookshelf uses string type, not FURNITURE_TYPES constant
                    this.animateGalleryHeartbeat(visualElements.structure, time, this.params.bookshelf);
                    break;
                    
                case window.FURNITURE_TYPES.GALLERY_WALL:
                    this.animateGalleryHeartbeat(visualElements.structure, time, this.params.gallery_wall);
                    break;
                    
                case 'stage_small':  // Stage uses string type
                case window.FURNITURE_TYPES.STAGE_SMALL:
                    console.log(`ðŸŽ¨ [STAGE-DEBUG] MATCHED! Calling animateStageSweep for ${furnitureId}`);
                    this.animateStageSweep(visualElements.structure, time, this.params.stage_small, furnitureId);
                    break;
                    
                case 'stage_large':  // Stage uses string type
                case window.FURNITURE_TYPES.STAGE_LARGE:
                    console.log(`ðŸŽ¨ [STAGE-DEBUG] MATCHED! Calling animateStageSweep for ${furnitureId}`);
                    this.animateStageSweep(visualElements.structure, time, this.params.stage_large, furnitureId);
                    break;
                    
                case window.FURNITURE_TYPES.AMPHITHEATRE:
                    this.animateAmphitheatreRainbow(visualElements.structure, time, this.params.amphitheatre);
                    break;
                    
                default:
                    if (!this._unknownTypes) this._unknownTypes = new Set();
                    if (!this._unknownTypes.has(furniture.type)) {
                        this._unknownTypes.add(furniture.type);
                        console.log(`ðŸŽ¨ [IDLE-ANIM] Unknown furniture type: ${furniture.type} for ${furnitureId}`);
                    }
                    break;
            }
        }

        /**
         * RISER ANIMATION: Dynamic wave flowing across tiers with color shifts
         * Like voices rising and falling in a choir with crescendo effects
         */
        animateRiserWave(structures, time, params) {
            // Riser has multiple segments per tier (10-15 segments each)
            // Structure order: tier 0 segments, tier 1 segments, tier 2 segments
            
            const totalSegments = structures.length;
            const segmentsPerTier = Math.ceil(totalSegments / 3);
            
            for (let tierIndex = 0; tierIndex < 3; tierIndex++) {
                // Calculate wave phase for this tier
                const wavePhase = (time / params.waveSpeed) % params.cyclePeriod;
                const tierDelay = tierIndex * params.tierStagger;
                const adjustedPhase = wavePhase - tierDelay;
                
                let intensity = 0;
                if (adjustedPhase > 0 && adjustedPhase < params.waveSpeed) {
                    // Wave is active for this tier
                    intensity = Math.sin((adjustedPhase / params.waveSpeed) * Math.PI) * params.maxIntensity;
                }
                
                // Apply to all segments in this tier
                const tierStart = tierIndex * segmentsPerTier;
                const tierEnd = Math.min(tierStart + segmentsPerTier, totalSegments);
                
                for (let i = tierStart; i < tierEnd; i++) {
                    const mesh = structures[i];
                    if (!mesh || !mesh.material) continue;
                    
                    mesh.material.emissive.setHex(params.glowColor);
                    mesh.material.emissiveIntensity = intensity;
                }
            }
        }

        /**
         * GALLERY WALL & BOOKSHELF ANIMATION: Rainbow wave across shelves
         * Each shelf lights up with a different color
         */
        animateGalleryHeartbeat(structures, time, params) {
            const hueBase = (time / params.pulseSpeed * 360) % 360;
            
            structures.forEach((mesh, index) => {
                if (!mesh || !mesh.material) return;
                
                // Each shelf/structure gets a different color offset
                const shelfHue = (hueBase + index * 60) % 360; // 60 degrees apart
                
                // Convert HSL to RGB
                const color = new this.THREE.Color().setHSL(
                    shelfHue / 360,
                    1.0,  // Full saturation
                    0.5   // Medium lightness
                );
                
                // Pulsing intensity
                const pulsePhase = (time * 1.5 + index * 0.3) % (Math.PI * 2);
                const intensity = (0.5 + 0.5 * Math.sin(pulsePhase)) * params.maxIntensity;
                
                mesh.material.emissive.copy(color);
                mesh.material.emissiveIntensity = intensity;
                
                // Subtle breathing scale animation
                const scale = 1.0 + intensity * params.breatheScale;
                mesh.scale.setScalar(scale);
            });
        }

        /**
         * STAGE ANIMATION: Concert lighting with circular spotlights
         * Creates circular spotlight patches that move across the stage surface
         */
        animateStageSweep(structures, time, params, furnitureId) {
            console.log(`ðŸŽ¨ [STAGE-SWEEP] Called for ${furnitureId}, structures.length: ${structures.length}`);
            
            if (structures.length === 0) return;
            
            const pulseCycle = (time / params.pulseSpeed) % 1.0;
            const numSpotlights = params.numSpotlights || 3;
            
            // Get or create spotlight geometry
            if (!this.spotlightGeometry.has(furnitureId)) {
                console.log(`ðŸŽ¨ [STAGE-SWEEP] Creating new spotlights for ${furnitureId}`);
                this.createSpotlightGeometry(furnitureId, structures, numSpotlights, params);
            }
            
            const spotlights = this.spotlightGeometry.get(furnitureId);
            console.log(`ðŸŽ¨ [STAGE-SWEEP] Retrieved spotlights:`, spotlights ? spotlights.length : 'NULL');
            if (!spotlights) {
                console.log(`ðŸŽ¨ [STAGE-SWEEP] ERROR: No spotlights found!`);
                return;
            }
            
            // Breathing purple pulse for stage structure (subtle ambient)
            const pulseIntensity = params.ambientIntensity * (0.7 + 0.3 * Math.sin(pulseCycle * Math.PI * 2));
            console.log(`ðŸŽ¨ [STAGE-SWEEP] Pulse intensity: ${pulseIntensity.toFixed(3)}`);
            
            structures.forEach((mesh, idx) => {
                if (!mesh || !mesh.material) {
                    console.log(`ðŸŽ¨ [STAGE-SWEEP] WARN: Structure ${idx} missing mesh or material`);
                    return;
                }
                mesh.material.emissive.setHex(params.ambientColor);
                mesh.material.emissiveIntensity = pulseIntensity;
                if (idx === 0) {
                    console.log(`ðŸŽ¨ [STAGE-SWEEP] Structure[0] emissive: ${mesh.material.emissive.getHexString()}, intensity: ${mesh.material.emissiveIntensity}`);
                }
            });
            
            // Calculate stage bounds
            const stageStart = structures[0].position;
            const stageEnd = structures[structures.length - 1].position;
            const stageY = stageStart.y + 0.02; // Just above stage surface
            
            console.log(`ðŸŽ¨ [STAGE-SWEEP] Stage bounds: start(${stageStart.x.toFixed(2)}, ${stageStart.y.toFixed(2)}, ${stageStart.z.toFixed(2)}), end(${stageEnd.x.toFixed(2)}, ${stageEnd.y.toFixed(2)}, ${stageEnd.z.toFixed(2)}), Y: ${stageY.toFixed(2)}`);
            
            // Update spotlight positions - each follows different pattern
            spotlights.forEach((spotlight, index) => {
                if (!spotlight || !spotlight.material) {
                    console.log(`ðŸŽ¨ [STAGE-SWEEP] WARN: Spotlight ${index} missing mesh or material`);
                    return;
                }
                
                // Different speed and direction for each spotlight
                const speedMult = 1.0 + (index * 0.3);
                const sweepTime = (time / params.sweepSpeed) * speedMult;
                
                // Spotlight 1: Left to right
                // Spotlight 2: Right to left (offset phase)
                // Spotlight 3: Front to back diagonal
                let x, z;
                
                if (index === 0) {
                    // Left to right
                    const phase = sweepTime % 1.0;
                    x = stageStart.x + (stageEnd.x - stageStart.x) * phase;
                    z = stageStart.z + (stageEnd.z - stageStart.z) * 0.3;
                } else if (index === 1) {
                    // Right to left (reverse)
                    const phase = (sweepTime + 0.5) % 1.0;
                    x = stageStart.x + (stageEnd.x - stageStart.x) * (1.0 - phase);
                    z = stageStart.z + (stageEnd.z - stageStart.z) * 0.7;
                } else {
                    // Diagonal crossing
                    const phase = (sweepTime + 0.25) % 1.0;
                    x = stageStart.x + (stageEnd.x - stageStart.x) * phase;
                    z = stageStart.z + (stageEnd.z - stageStart.z) * phase;
                }
                
                spotlight.position.set(x, stageY, z);
                
                // Fade in/out at edges for smooth appearance
                const edgeFade = Math.min(
                    Math.abs(x - stageStart.x) / 1.0,
                    Math.abs(stageEnd.x - x) / 1.0,
                    1.0
                );
                spotlight.material.opacity = 0.4 * edgeFade;
                
                if (index === 0) {
                    console.log(`ðŸŽ¨ [STAGE-SWEEP] Spotlight[0] pos: (${x.toFixed(2)}, ${stageY.toFixed(2)}, ${z.toFixed(2)}), opacity: ${spotlight.material.opacity.toFixed(3)}, visible: ${spotlight.visible}`);
                }
            });
        }
        
        /**
         * Create circular spotlight geometry for stage
         */
        createSpotlightGeometry(furnitureId, structures, numSpotlights, params) {
            console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] Starting creation for ${furnitureId}`);
            console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] window.scene exists: ${!!window.scene}`);
            console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] structures.length: ${structures.length}`);
            console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] numSpotlights: ${numSpotlights}`);
            console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] params:`, params);
            
            if (!window.scene || structures.length === 0) {
                console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] ABORTED: Missing scene or structures`);
                return;
            }
            
            const spotlights = [];
            const radius = params.spotRadius || 1.5;
            console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] Using radius: ${radius}`);
            
            for (let i = 0; i < numSpotlights; i++) {
                // Create circular spotlight (fuzzy edges via radial gradient texture)
                const canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                
                // Create radial gradient for fuzzy edges
                const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
                gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 128, 128);
                
                const texture = new this.THREE.CanvasTexture(canvas);
                const geometry = new this.THREE.CircleGeometry(radius, 32);
                const material = new this.THREE.MeshBasicMaterial({
                    map: texture,
                    color: params.spotColor,
                    transparent: true,
                    opacity: 0.5,
                    side: this.THREE.DoubleSide,
                    depthWrite: false
                });
                
                const spotlight = new this.THREE.Mesh(geometry, material);
                spotlight.rotation.x = -Math.PI / 2; // Lay flat on stage
                spotlight.userData.isSpotlight = true;
                spotlight.userData.furnitureId = furnitureId;
                
                console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] Created spotlight ${i}:`, {
                    radius: radius,
                    color: params.spotColor.toString(16),
                    opacity: material.opacity,
                    transparent: material.transparent,
                    position: spotlight.position.toArray(),
                    rotation: spotlight.rotation.toArray(),
                    visible: spotlight.visible
                });
                
                spotlights.push(spotlight);
                window.scene.add(spotlight);
                console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] Added spotlight ${i} to scene`);
            }
            
            this.spotlightGeometry.set(furnitureId, spotlights);
            console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] âœ… Stored ${spotlights.length} spotlights for ${furnitureId}`);
            console.log(`ðŸŽ¨ [CREATE-SPOTLIGHT] Total scene children: ${window.scene.children.length}`);
        }

        /**
         * AMPHITHEATRE ANIMATION: Rainbow aurora wave
         * Like northern lights dancing across tiers
         */
        animateAmphitheatreRainbow(structures, time, params) {
            // Calculate base hue that rotates through full rainbow
            const hueBase = (time / params.rainbowSpeed * 360) % 360;
            
            structures.forEach((tier, index) => {
                if (!tier || !tier.material) return;
                
                // Each tier has a different color, offset by hueOffset degrees
                const tierHue = (hueBase + index * params.hueOffset) % 360;
                
                // Convert HSL to RGB color
                const color = new this.THREE.Color().setHSL(
                    tierHue / 360,
                    params.saturation,
                    params.lightness
                );
                
                // Shimmer effect - oscillate intensity for ethereal feel
                const shimmerPhase = time * 2.0 + index * 0.5;
                const shimmerAmount = 0.5 + 0.5 * Math.sin(shimmerPhase);
                const intensity = params.minIntensity + (params.maxIntensity - params.minIntensity) * shimmerAmount;
                
                // Apply color and intensity
                tier.material.emissive.copy(color);
                tier.material.emissiveIntensity = intensity;
                
                // Optional: Also animate metalness for extra shimmer on metallic materials
                // This creates a nice interplay with the rainbow colors
                const baseMetalness = (tier.material.userData && tier.material.userData.originalMetalness !== undefined) 
                    ? tier.material.userData.originalMetalness 
                    : tier.material.metalness;
                const metallicShimmer = baseMetalness + 0.2 * Math.sin(time * 1.5 + index * 0.3);
                tier.material.metalness = Math.max(0, Math.min(1, metallicShimmer));
            });
        }

        /**
         * Stop idle animation and restore original material properties
         * Called when playback starts
         */
        stopAnimation(furnitureId, visualManager) {
            const state = this.animationStates.get(furnitureId);
            if (!state || !state.isActive) return;
            
            const visualElements = visualManager.furnitureMeshes.get(furnitureId);
            if (!visualElements || !visualElements.structure) return;
            
            // Restore original material properties
            visualElements.structure.forEach(mesh => {
                if (!mesh || !mesh.material) return;
                
                // Restore material from preservation system
                this.restoreMaterial(mesh);
                
                // Restore original scale
                mesh.scale.setScalar(1.0);
            });
            
            // Mark as inactive
            state.isActive = false;
            
            console.log(`ðŸŽ¨ Stopped idle animation for furniture ${furnitureId}`);
        }

        /**
         * Store original material properties before first animation
         * This allows proper restoration after playback
         */
        storeOriginalMaterialProperties(structures) {
            structures.forEach(mesh => {
                if (!mesh || !mesh.material) return;
                if (mesh.material.userData && mesh.material.userData.originalMetalness !== undefined) return; // Already stored
                
                mesh.material.userData = mesh.material.userData || {};
                mesh.material.userData.originalMetalness = mesh.material.metalness;
            });
        }

        /**
         * Enable/disable all idle animations (for performance testing)
         */
        setEnabled(enabled) {
            this.isEnabled = enabled;
            console.log(`ðŸŽ¨ Idle animations ${enabled ? 'enabled' : 'disabled'}`);
        }

        /**
         * Cleanup - remove animation states
         */
        dispose() {
            this.animationStates.clear();
            console.log('ðŸŽ¨ Furniture Idle Animation Manager disposed');
        }
    }

    // ============================================================================
    // EXPORT TO GLOBAL SCOPE
    // ============================================================================
    
    console.log('ðŸ”´ About to export FurnitureIdleAnimationManager to window...');
    window.FurnitureIdleAnimationManager = FurnitureIdleAnimationManager;
    console.log('ðŸ”´ Export complete!');
    
    console.log('ðŸŽ¨ Furniture Idle Animations Module loaded successfully');
    console.log('ðŸŽ¨ FurnitureIdleAnimationManager exported to window:', typeof window.FurnitureIdleAnimationManager);
    
    console.log('ðŸ”´ðŸ”´ðŸ”´ ANIMATION MODULE IIFE COMPLETED ðŸ”´ðŸ”´ðŸ”´');

})();


/**
 * FURNITURE MANAGER
 * Main coordinator for furniture system - manages creation, visualization, and interaction
 */

(function() {
    'use strict';

    console.log('ðŸª‘ Loading Furniture Manager...');

    // ============================================================================
    // FURNITURE MANAGER CLASS
    // ============================================================================
    
    class FurnitureManager {
        constructor(app) {
            this.app = app;
            this.scene = app.scene;
            this.camera = app.camera;
            
            // Sub-managers (will be created after storage manager exists)
            this.storageManager = null;
            this.visualManager = new window.FurnitureVisualManager(this.scene, this.camera);
            
            // State
            this.initialized = false;
            this.currentWorldType = null;
            
            // Rotation interaction state
            this.rotatingFurniture = null;
            this.rotationStartAngle = 0;
            
            console.log('ðŸª‘ FurnitureManager created');
        }

        /**
         * Initialize furniture manager
         */
        async initialize() {
            if (this.initialized) {
                console.log('ðŸª‘ FurnitureManager already initialized');
                return;
            }

            console.log('ðŸª‘ Initializing FurnitureManager...');
            
            try {
                // Initialize storage manager
                this.storageManager = new window.FurnitureStorageManager();
                await this.storageManager.initialize();
                console.log('ðŸª‘ Storage manager initialized');
                
                // Load furniture for current world
                this.currentWorldType = this.app.currentWorldTemplate?.getType() || 'green-plane';
                console.log(`ðŸª‘ Current world type: ${this.currentWorldType}`);
                
                await this.loadFurnitureForCurrentWorld();
                
                this.initialized = true;
                console.log('ðŸª‘ FurnitureManager initialized successfully');
            } catch (error) {
                console.error('ðŸª‘ ERROR initializing FurnitureManager:', error);
                throw error;
            }
        }

        /**
         * Load and display furniture for current world
         */
        async loadFurnitureForCurrentWorld() {
            const furniturePieces = this.storageManager.getFurnitureForWorld(this.currentWorldType);
            
            console.log(`ðŸª‘ Loading ${furniturePieces.length} furniture pieces for ${this.currentWorldType}`);
            
            // ðŸ”§ AUTOMATIC CLEANUP: Clean duplicate slots IMMEDIATELY after loading furniture data
            // This fixes existing bad data from previous bugs before any operations happen
            let totalCleaned = 0;
            for (const furniture of furniturePieces) {
                const cleaned = furniture.removeDuplicateSlots();
                if (cleaned > 0) {
                    console.log(`ðŸª‘ðŸ”§ Cleaned ${cleaned} duplicate slots from ${furniture.name}`);
                    totalCleaned += cleaned;
                }
            }
            if (totalCleaned > 0) {
                console.log(`ðŸª‘ðŸ”§ Auto-cleanup removed ${totalCleaned} total duplicate slots`);
                this.storageManager.saveFurniture();
            }
            
            for (const furniture of furniturePieces) {
                await this.visualManager.addFurniture(furniture);
                
                // Notify Flutter about loaded furniture so it can track it in state
                if (window.ObjectActionChannel) {
                    const messageData = {
                        action: 'furnitureCreated',
                        id: furniture.id,
                        name: furniture.name,
                        type: 'furniture',
                        furnitureType: furniture.type,
                        worldType: furniture.worldType
                    };
                    console.log('ðŸª‘ Sending loaded furniture notification to Flutter:', messageData);
                    window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
                }
                
                // Restore objects on furniture
                await this.restoreFurnitureObjects(furniture);
            }

            // Clean up any stale occupied slots after all furniture is loaded
            console.log('ðŸª‘ Running stale slot cleanup after furniture load...');
            await this.clearAllStaleSlots();
            
            // Apply gravity to drop orphaned objects (objects that lost their furniture)
            console.log('ðŸª‘ Applying gravity to orphaned objects after furniture load...');
            if (this.app && this.app.worldManager && this.app.worldManager.applyGravityToFloatingObjects) {
                setTimeout(() => {
                    this.app.worldManager.applyGravityToFloatingObjects();
                }, 200);
            }
        }

        /**
         * Handle world switch
         */
        async onWorldSwitch(newWorldType) {
            console.log(`ðŸª‘ World switched to: ${newWorldType}`);
            
            // Clear current world furniture visuals
            const currentFurniture = this.storageManager.getFurnitureForWorld(this.currentWorldType);
            for (const furniture of currentFurniture) {
                this.visualManager.removeFurniture(furniture.id);
            }
            
            // Load new world furniture
            this.currentWorldType = newWorldType;
            await this.loadFurnitureForCurrentWorld();
        }

        /**
         * Restore objects to their furniture slots after loading
         */
        async restoreFurnitureObjects(furniture) {
            if (!furniture.objectIds || furniture.objectIds.length === 0) return;
            
            const furnitureGroup = this.visualManager.getFurnitureGroup(furniture.id);
            if (!furnitureGroup) return;
            
            console.log(`ðŸª‘ Restoring ${furniture.objectIds.length} objects to furniture ${furniture.id}`);
            
            furniture.objectIds.forEach((objectId, index) => {
                if (!objectId) return;
                
                // Find object mesh
                const objectMesh = this.findObjectById(objectId);
                if (!objectMesh) {
                    console.warn(`ðŸª‘ Object ${objectId} not found for furniture restoration`);
                    return;
                }
                
                // CRITICAL FIX: Parent object to furniture group so it moves with furniture
                if (objectMesh.parent !== furnitureGroup) {
                    // Get current world position before re-parenting
                    const currentWorldPos = new window.THREE.Vector3();
                    objectMesh.getWorldPosition(currentWorldPos);
                    
                    // Remove from current parent (scene)
                    if (objectMesh.parent) {
                        objectMesh.parent.remove(objectMesh);
                    }
                    
                    // Add to furniture group
                    furnitureGroup.add(objectMesh);
                    
                    console.log(`ðŸª‘ Parented restored object ${objectId} to furniture group`);
                }
                
                // Get slot position (already in local coordinates)
                const slotPos = furniture.getSlotPosition(index);
                if (!slotPos) return;
                
                // CRITICAL: Adjust Y position so object's BOTTOM sits on marker, not center
                const objectHeight = objectMesh.userData?.objectHeight || 
                                   objectMesh.geometry?.parameters?.height || 2.5;
                const targetY = slotPos.y + (objectHeight / 2); // Center = surface + half height
                
                // Place object using LOCAL coordinates (since it's parented to furniture)
                objectMesh.position.set(slotPos.x, targetY, slotPos.z);
                // Apply slot rotation if available (for amphitheatre facing outward)
                objectMesh.rotation.y = slotPos.rotation || 0;
                objectMesh.userData.furnitureId = furniture.id;
                objectMesh.userData.furnitureSlotIndex = index;
                objectMesh.userData.preservePosition = true; // Prevent sorting/gravity
                
                console.log(`ðŸª‘ Restored object ${objectId} to LOCAL slot ${index}: (${slotPos.x.toFixed(2)}, ${targetY.toFixed(2)}, ${slotPos.z.toFixed(2)})`);
                
                // CRITICAL: Persist WORLD position to Flutter so it survives next restart
                if (window.ObjectMovedChannel) {
                    const worldPos = new window.THREE.Vector3();
                    objectMesh.getWorldPosition(worldPos);
                    
                    const isContact = objectMesh.userData.type === 'fileObject' && 
                                      objectMesh.userData.subType === 'contact';
                    const moveData = {
                        id: isContact ? `contact://${objectMesh.userData.id}` : objectMesh.userData.id,
                        x: worldPos.x,
                        y: worldPos.y,
                        z: worldPos.z,
                        furnitureId: furniture.id,  // Include furniture metadata
                        slotIndex: index   // Include slot index
                    };
                    window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                    console.log(`ðŸª‘ Persisted restored WORLD position: ${objectId} at (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}) on furniture ${furniture.id} slot ${index}`);
                }
            });
        }

        /**
         * Create a new furniture piece
         */
        async createFurniture(config) {
            // Add current world type
            config.worldType = this.currentWorldType;
            
            // Create furniture object
            const furniture = new window.Furniture(config);
            
            // Add to storage
            const added = await this.storageManager.addFurniture(furniture);
            if (!added) {
                console.error('ðŸª‘ Failed to add furniture to storage');
                return null;
            }
            
            // Add visualization
            await this.visualManager.addFurniture(furniture);
            
            console.log(`ðŸª‘ Created furniture: ${furniture.id} (${furniture.type})`);
            
            // Notify Flutter about furniture creation (for tracking/UI updates)
            // SKIP notification if interactions are disabled (during default furniture creation)
            if (window.ObjectActionChannel && !window.interactionsDisabled) {
                const messageData = {
                    action: 'furnitureCreated',
                    id: furniture.id,
                    name: furniture.name,
                    type: 'furniture',
                    furnitureType: furniture.type,
                    worldType: furniture.worldType
                };
                console.log('ðŸª‘ Sending furniture creation notification to Flutter:', messageData);
                window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
            } else if (window.interactionsDisabled) {
                console.log('ðŸª‘ Skipping Flutter notification during initialization:', furniture.id);
            }
            
            return furniture;
        }

        /**
         * Delete a furniture piece
         */
        async deleteFurniture(furnitureId) {
            console.log(`ðŸª‘ FurnitureManager deleteFurniture called for: ${furnitureId}`);
            
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.warn('ðŸª‘ Furniture not found:', furnitureId);
                return false;
            }
            
            // Get furniture group before deletion
            const furnitureGroup = this.visualManager.getFurnitureGroup(furnitureId);
            if (!furnitureGroup) {
                console.warn('ðŸª‘ Furniture group not found:', furnitureId);
            }
            
            // CRITICAL: Reparent all objects BEFORE removing furniture
            const objectsToReparent = [];
            
            furniture.objectIds.forEach(objectId => {
                if (!objectId) return;
                const objectMesh = this.findObjectById(objectId);
                if (objectMesh && objectMesh.userData) {
                    objectsToReparent.push({ id: objectId, mesh: objectMesh });
                }
            });
            
            console.log(`ðŸª‘ Found ${objectsToReparent.length} objects to reparent`);
            
            // Reparent each object to scene with world position
            objectsToReparent.forEach(({ id, mesh }) => {
                // Get world position BEFORE reparenting
                const worldPos = new window.THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                
                const worldQuat = new window.THREE.Quaternion();
                mesh.getWorldQuaternion(worldQuat);
                
                // Remove from current parent (furniture group)
                if (mesh.parent) {
                    mesh.parent.remove(mesh);
                }
                
                // Add to scene
                this.scene.add(mesh);
                
                // Set world position and rotation
                mesh.position.copy(worldPos);
                mesh.quaternion.copy(worldQuat);
                
                // Calculate object height for ground placement
                const objectHeight = mesh.geometry?.boundingBox 
                    ? (mesh.geometry.boundingBox.max.y - mesh.geometry.boundingBox.min.y) * mesh.scale.y
                    : 2.5; // Default height
                
                // Drop to ground level (Y = height/2 so bottom touches ground)
                mesh.position.y = objectHeight / 2;
                
                // Clear furniture metadata
                mesh.userData.preservePosition = false;
                mesh.userData.furnitureId = null;
                mesh.userData.furnitureSlotIndex = null;
                
                // Update fileData for persistence
                if (mesh.userData.fileData) {
                    mesh.userData.fileData.x = mesh.position.x;
                    mesh.userData.fileData.y = mesh.position.y;
                    mesh.userData.fileData.z = mesh.position.z;
                    mesh.userData.fileData.furnitureId = null;
                    mesh.userData.fileData.furnitureSlotIndex = null;
                }
                
                // Persist updated position to Flutter
                if (window.ObjectMovedChannel && mesh.userData.fileData) {
                    window.ObjectMovedChannel.postMessage(JSON.stringify({
                        id: id,
                        fileName: mesh.userData.fileName,
                        x: mesh.position.x,
                        y: mesh.position.y,
                        z: mesh.position.z,
                        furnitureId: null,
                        furnitureSlotIndex: null
                    }));
                }
                
                console.log(`ðŸª‘ Reparented object ${id} to scene at (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
            });
            
            // Apply gravity to dropped objects
            if (this.app && this.app.worldManager && this.app.worldManager.applyGravityToFloatingObjects) {
                console.log(`ðŸª‘ Applying gravity to objects after furniture deletion`);
                setTimeout(() => {
                    this.app.worldManager.applyGravityToFloatingObjects();
                }, 100);
            }
            
            // Remove visualization (from scene)
            this.visualManager.removeFurniture(furnitureId);
            
            // Remove from fileObjects array if present
            if (this.app && this.app.stateManager && this.app.stateManager.fileObjects) {
                const index = this.app.stateManager.fileObjects.findIndex(obj => obj.userData.id === furnitureId);
                if (index !== -1) {
                    const furnitureGroup = this.app.stateManager.fileObjects[index];
                    if (furnitureGroup.parent) {
                        furnitureGroup.parent.remove(furnitureGroup);
                    }
                    this.app.stateManager.fileObjects.splice(index, 1);
                    console.log(`ðŸª‘ Removed furniture from fileObjects and scene: ${furnitureId}`);
                }
            }
            
            // Remove from storage
            await this.storageManager.removeFurniture(furnitureId);
            
            console.log(`ðŸª‘ Deleted furniture: ${furnitureId}`);
            return true;
        }

        /**
         * Add object to furniture
         */
        async addObjectToFurniture(furnitureId, objectId, skipAutoSort = false) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.error('ðŸª‘ Furniture not found:', furnitureId);
                return -1;
            }

            // Check if this object was previously on THIS furniture (being rearranged)
            const objectMesh = this.findObjectById(objectId);
            const wasOnThisFurniture = objectMesh && objectMesh.userData.furnitureId === furnitureId;
            
            const slotIndex = furniture.addObject(objectId);
            if (slotIndex === -1) {
                console.warn('ðŸª‘ Furniture is full, cannot add object');
                return -1;
            }
            
            // SMART AUTO-SORT: Only auto-sort if explicitly allowed
            // When manually adding via "Add to Furniture" menu, skipAutoSort=true to avoid displacing existing objects
            if (!wasOnThisFurniture && furniture.autoSort && !skipAutoSort) {
                console.log(`ðŸª‘ Auto-sorting NEW object ${objectId} into furniture ${furnitureId}`);
                await this.sortFurniture(furnitureId);
            } else if (wasOnThisFurniture) {
                console.log(`ðŸª‘ Object ${objectId} being rearranged manually - skipping auto-sort`);
            } else if (skipAutoSort) {
                console.log(`ðŸª‘ Manual addition via menu - skipping auto-sort to preserve existing object positions`);
            }
            
            // Get final slot index (after sort if it happened)
            const finalSlotIndex = furniture.objectIds.indexOf(objectId);
            console.log(`ðŸª‘ [DEBUG] After sort - finalSlotIndex: ${finalSlotIndex}, objectMesh exists: ${!!objectMesh}`);
            
            // Update object position to furniture slot
            if (objectMesh) {
                const furnitureGroup = this.visualManager.getFurnitureGroup(furnitureId);
                const slotPos = furniture.getSlotPosition(finalSlotIndex);
                console.log(`ðŸª‘ [DEBUG] furnitureGroup exists: ${!!furnitureGroup}, slotPos exists: ${!!slotPos}`);
                
                if (slotPos && furnitureGroup) {
                    // CRITICAL FIX: Parent object to furniture group so it moves with furniture
                    if (objectMesh.parent !== furnitureGroup) {
                        // Get current world position before re-parenting
                        const worldPos = new window.THREE.Vector3();
                        objectMesh.getWorldPosition(worldPos);
                        
                        // Remove from current parent (scene)
                        if (objectMesh.parent) {
                            objectMesh.parent.remove(objectMesh);
                        }
                        
                        // Add to furniture group
                        furnitureGroup.add(objectMesh);
                        
                        // Convert world position to local coordinates
                        const localPos = furnitureGroup.worldToLocal(worldPos.clone());
                        objectMesh.position.copy(localPos);
                        
                        console.log(`ðŸª‘ Parented object ${objectId} to furniture group`);
                    }
                    
                    // Now set the local position based on slot
                    // CRITICAL: Adjust Y position so object's BOTTOM sits on marker, not center
                    const objectHeight = objectMesh.userData?.objectHeight || 
                                       objectMesh.geometry?.parameters?.height || 2.5;
                    const targetY = slotPos.y + (objectHeight / 2); // Center = surface + half height
                    
                    objectMesh.position.set(slotPos.x, targetY, slotPos.z);
                    // Apply slot rotation if available (for amphitheatre facing outward)
                    const slotRotation = slotPos.rotation || 0;
                    objectMesh.rotation.y = slotRotation;
                    console.log(`ðŸª‘ Applied rotation: ${(slotRotation * 180 / Math.PI).toFixed(1)}Â° to object at slot ${finalSlotIndex}`);
                    objectMesh.userData.furnitureId = furnitureId;
                    objectMesh.userData.furnitureSlotIndex = finalSlotIndex;
                    objectMesh.userData.preservePosition = true; // Prevent sorting/gravity
                    
                    console.log(`ðŸª‘ Placed object ${objectId} at LOCAL slot ${finalSlotIndex}: (${slotPos.x.toFixed(2)}, ${targetY.toFixed(2)}, ${slotPos.z.toFixed(2)}), rotation: ${(slotRotation * 180 / Math.PI).toFixed(1)}Â°`);
                    
                    // CRITICAL: Persist position AND ROTATION to Flutter so it survives app restart
                    // Send WORLD position and LOCAL rotation for Flutter persistence
                    if (window.ObjectMovedChannel) {
                        const worldPos = new window.THREE.Vector3();
                        objectMesh.getWorldPosition(worldPos);
                        
                        const isContact = objectMesh.userData.type === 'fileObject' && 
                                          objectMesh.userData.subType === 'contact';
                        const moveData = {
                            id: isContact ? `contact://${objectMesh.userData.id}` : objectMesh.userData.id,
                            x: worldPos.x,
                            y: worldPos.y,
                            z: worldPos.z,
                            rotation: objectMesh.rotation.y,  // ROTATION FIX: Include local rotation
                            furnitureId: furnitureId,  // Include furniture metadata
                            slotIndex: finalSlotIndex   // Include slot index
                        };
                        window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                        console.log(`ðŸª‘ Persisted furniture object WORLD position: ${objectId} at (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}), rotation: ${(objectMesh.rotation.y * 180 / Math.PI).toFixed(1)}Â° on furniture ${furnitureId} slot ${finalSlotIndex}`);
                    }
                }
            }
            
            await this.storageManager.updateFurniture(furniture);
            console.log(`ðŸª‘ Added object ${objectId} to furniture ${furnitureId}`);
            
            return finalSlotIndex;
        }

        /**
         * Remove object from furniture
         */
        async removeObjectFromFurniture(furnitureId, objectId) {
            console.log(`ðŸª‘ðŸ”§ removeObjectFromFurniture() CALLED: furnitureId=${furnitureId}, objectId=${objectId}`);
            
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.log(`ðŸª‘ðŸ”§ EARLY EXIT: Furniture ${furnitureId} not found in storageManager`);
                return false;
            }
            
            console.log(`ðŸª‘ðŸ”§ Furniture found: ${furniture.id}, type=${furniture.type}, capacity=${furniture.capacity}`);
            console.log(`ðŸª‘ðŸ”§ Current furniture.objectIds:`, furniture.objectIds);

            const slotIndex = furniture.removeObject(objectId);
            console.log(`ðŸª‘ðŸ”§ furniture.removeObject() returned slotIndex: ${slotIndex}`);
            
            // CRITICAL: Also clear the slot from objectIds array immediately
            if (slotIndex >= 0 && furniture.objectIds) {
                console.log(`ðŸª‘ðŸ”§ Clearing furniture.objectIds[${slotIndex}] immediately`);
                furniture.objectIds[slotIndex] = null;
                console.log(`ðŸª‘ðŸ”§ âœ… furniture.objectIds[${slotIndex}] cleared`);
            }
            
            if (slotIndex >= 0) {
                console.log(`ðŸª‘ðŸ”§ âœ… Object was in slot ${slotIndex}, proceeding with cleanup...`);
                
                // Find the object and clear its furniture flags
                const objectMesh = this.findObjectById(objectId);
                console.log(`ðŸª‘ðŸ”§ findObjectById() returned:`, objectMesh ? `Object3D (${objectMesh.type})` : 'null');
                
                if (objectMesh && objectMesh.userData) {
                    console.log(`ðŸª‘ðŸ”§ BEFORE clearing flags:`);
                    console.log(`ðŸª‘ðŸ”§   - object.userData.preservePosition: ${objectMesh.userData.preservePosition}`);
                    console.log(`ðŸª‘ðŸ”§   - object.userData.furnitureId: ${objectMesh.userData.furnitureId}`);
                    console.log(`ðŸª‘ðŸ”§   - object.userData.furnitureSlotIndex: ${objectMesh.userData.furnitureSlotIndex}`);
                    console.log(`ðŸª‘ðŸ”§   - object.parent: ${objectMesh.parent?.type} (${objectMesh.parent?.userData?.id || objectMesh.parent?.name || 'unnamed'})`);
                    
                    objectMesh.userData.preservePosition = false;
                    objectMesh.userData.furnitureId = null;
                    objectMesh.userData.furnitureSlotIndex = null;
                    console.log(`ðŸª‘ðŸ”§ âœ… Cleared furniture flags for ${objectId}`);
                    
                    // CRITICAL: Re-parent object to scene (remove from furniture group)
                    const furnitureGroup = this.visualManager?.getFurnitureGroup(furnitureId);
                    console.log(`ðŸª‘ðŸ”§ visualManager.getFurnitureGroup() returned:`, furnitureGroup ? `Group (${furnitureGroup.type})` : 'null');
                    console.log(`ðŸª‘ðŸ”§ Is object parented to this furniture group? ${objectMesh.parent === furnitureGroup}`);
                    
                    if (furnitureGroup && objectMesh.parent === furnitureGroup) {
                        console.log(`ðŸª‘ðŸ”§ âœ… PERFORMING RE-PARENTING...`);
                        
                        // Convert local position to world coordinates before re-parenting
                        const worldPos = new window.THREE.Vector3();
                        objectMesh.getWorldPosition(worldPos);
                        console.log(`ðŸª‘ðŸ”§ Object world position: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
                        
                        // Remove from furniture group
                        console.log(`ðŸª‘ðŸ”§ Removing from furniture group...`);
                        furnitureGroup.remove(objectMesh);
                        console.log(`ðŸª‘ðŸ”§ âœ… Removed from furniture group`);
                        
                        // Add to scene
                        console.log(`ðŸª‘ðŸ”§ Adding to scene...`);
                        window.app.scene.add(objectMesh);
                        console.log(`ðŸª‘ðŸ”§ âœ… Added to scene`);
                        
                        // Set world position
                        objectMesh.position.copy(worldPos);
                        console.log(`ðŸª‘ðŸ”§ âœ… Set world position to (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
                        
                        console.log(`ðŸª‘ðŸ”§ âœ… RE-PARENTING COMPLETE`);
                        console.log(`ðŸª‘ðŸ”§ AFTER re-parenting:`);
                        console.log(`ðŸª‘ðŸ”§   - object.parent: ${objectMesh.parent?.type} (${objectMesh.parent?.userData?.id || objectMesh.parent?.name || 'unnamed'})`);
                        console.log(`ðŸª‘ðŸ”§   - object.parent === scene? ${objectMesh.parent === window.app.scene}`);
                        console.log(`ðŸª‘ðŸ”§   - object.position: (${objectMesh.position.x.toFixed(2)}, ${objectMesh.position.y.toFixed(2)}, ${objectMesh.position.z.toFixed(2)})`);
                        
                        console.log(`ðŸª‘ Re-parented ${objectId} from furniture group to scene at (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
                    } else {
                        console.log(`ðŸª‘ðŸ”§ âš ï¸ SKIPPING RE-PARENTING: Object not parented to furniture group`);
                        console.log(`ðŸª‘ðŸ”§   - furnitureGroup exists? ${!!furnitureGroup}`);
                        console.log(`ðŸª‘ðŸ”§   - objectMesh.parent === furnitureGroup? ${objectMesh.parent === furnitureGroup}`);
                        console.log(`ðŸª‘ðŸ”§   - Current parent: ${objectMesh.parent?.type} (${objectMesh.parent?.userData?.id || objectMesh.parent?.name || 'unnamed'})`);
                    }
                    
                    // CRITICAL: Persist cleared furniture state to Flutter
                    if (window.ObjectMovedChannel) {
                        const isContact = objectMesh.userData.type === 'fileObject' && 
                                          objectMesh.userData.subType === 'contact';
                        const moveData = {
                            id: isContact ? `contact://${objectMesh.userData.id}` : objectMesh.userData.id,
                            x: objectMesh.position.x,
                            y: objectMesh.position.y,
                            z: objectMesh.position.z,
                            furnitureId: null,  // Clear furniture metadata
                            slotIndex: null
                        };
                        window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                        console.log(`ðŸª‘ Persisted cleared furniture state for ${objectId}`);
                    }
                }
                
                // CRITICAL: Update slot marker material to available state
                if (this.visualManager) {
                    const visualElements = this.visualManager.furnitureMeshes.get(furnitureId);
                    if (visualElements && visualElements.slots[slotIndex]) {
                        visualElements.slots[slotIndex].material = this.visualManager.slotMaterials.default;
                        console.log(`ðŸª‘ Updated slot ${slotIndex} marker to available state`);
                    }
                }
                
                await this.storageManager.updateFurniture(furniture);
                console.log(`ðŸª‘ Removed object ${objectId} from furniture ${furnitureId}`);
            }
            
            return slotIndex >= 0;
        }

        /**
         * Sort furniture objects by metadata (respects autoSort setting)
         */
        async sortFurniture(furnitureId) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture || furniture.objectIds.length === 0) return;
            
            // Check if auto-sort is enabled
            if (!furniture.autoSort) {
                console.log(`ðŸª‘ Auto-sort disabled for ${furnitureId} - using manual positions`);
                return;
            }
            
            console.log(`ðŸª‘ Auto-sorting furniture ${furnitureId} by ${furniture.sortCriteria} (${furniture.sortDirection})`);
            
            // Separate objects into two groups:
            // 1. Objects in scene (can be sorted)
            // 2. Objects in objectIds but not in scene yet (newly added - preserve them)
            const objectsInScene = [];
            const objectsNotYetInScene = [];
            
            furniture.objectIds.forEach(id => {
                if (!id || id === '') return;
                const mesh = this.findObjectById(id);
                if (mesh) {
                    objectsInScene.push({ id, userData: mesh.userData });
                } else {
                    // Object is in objectIds but not in scene yet - preserve it!
                    console.log(`ðŸª‘ Preserving newly added object ${id} during sort (not yet in scene)`);
                    objectsNotYetInScene.push(id);
                }
            });
            
            // Sort only the objects that exist in scene
            const sortedObjects = this.sortObjectsByCriteria(objectsInScene, furniture.sortCriteria, furniture.sortDirection);
            
            // Update furniture with sorted order - PRESERVE compact array (don't create 80 nulls)
            // Include both sorted objects AND objects not yet in scene
            furniture.objectIds = [];
            sortedObjects.forEach((obj, index) => {
                furniture.objectIds[index] = obj.id;
            });
            // Append objects not yet in scene at the end
            objectsNotYetInScene.forEach(id => {
                furniture.objectIds.push(id);
            });
            
            console.log(`ðŸª‘ Rearranged ${sortedObjects.length} objects on furniture (${objectsNotYetInScene.length} pending placement)`);
            
            await this.storageManager.updateFurniture(furniture);
            
            // Animate objects to new positions (only for objects already in scene)
            // CRITICAL: Don't call animateFurnitureRearrange if there are pending objects
            // because it will iterate ALL objectIds and log wrong count
            if (objectsInScene.length > 0 && objectsNotYetInScene.length === 0) {
                this.animateFurnitureRearrange(furniture);
            } else if (objectsNotYetInScene.length > 0) {
                console.log(`ðŸª‘ Skipping animateFurnitureRearrange - ${objectsNotYetInScene.length} objects pending placement`);
            }
        }
        
        /**
         * Sort objects based on criteria and direction
         */
        sortObjectsByCriteria(objects, criteria, direction) {
            const sorted = [...objects].sort((a, b) => {
                let aValue, bValue;
                
                switch (criteria) {
                    case 'fileName':
                        aValue = (a.userData.fileName || a.userData.name || '').toLowerCase();
                        bValue = (b.userData.fileName || b.userData.name || '').toLowerCase();
                        break;
                    case 'fileType':
                        aValue = a.userData.fileType || a.userData.type || '';
                        bValue = b.userData.fileType || b.userData.type || '';
                        break;
                    case 'artist':
                        aValue = (a.userData.artist || '').toLowerCase();
                        bValue = (b.userData.artist || '').toLowerCase();
                        break;
                    case 'title':
                        aValue = (a.userData.title || a.userData.fileName || '').toLowerCase();
                        bValue = (b.userData.title || b.userData.fileName || '').toLowerCase();
                        break;
                    case 'date':
                        aValue = a.userData.date || a.userData.createdAt || 0;
                        bValue = b.userData.date || b.userData.createdAt || 0;
                        break;
                    // Legacy support for old criteria
                    case window.SORTING_CRITERIA?.TITLE:
                        aValue = (a.userData.title || a.userData.fileName || '').toLowerCase();
                        bValue = (b.userData.title || b.userData.fileName || '').toLowerCase();
                        break;
                    case window.SORTING_CRITERIA?.ARTIST:
                        aValue = (a.userData.artist || '').toLowerCase();
                        bValue = (b.userData.artist || '').toLowerCase();
                        break;
                    default:
                        aValue = (a.userData.fileName || a.userData.name || '').toLowerCase();
                        bValue = (b.userData.fileName || b.userData.name || '').toLowerCase();
                }
                
                const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                return direction === 'ascending' ? comparison : -comparison;
            });
            
            return sorted;
        }

        /**
         * Get sort value from object userData (legacy method - kept for compatibility)
         */
        getSortValue(userData, criteria) {
            switch (criteria) {
                case window.SORTING_CRITERIA.TITLE:
                    return (userData.title || userData.fileName || '').toLowerCase();
                case window.SORTING_CRITERIA.ARTIST:
                    return (userData.artist || '').toLowerCase();
                case window.SORTING_CRITERIA.GENRE:
                    return (userData.genre || '').toLowerCase();
                case window.SORTING_CRITERIA.DATE:
                    return userData.date || userData.createdAt || 0;
                case window.SORTING_CRITERIA.TYPE:
                    return userData.fileType || userData.type || '';
                default:
                    return '';
            }
        }

        /**
         * Animate furniture rearrange (smooth transitions)
         */
        animateFurnitureRearrange(furniture) {
            const furnitureGroup = this.visualManager.getFurnitureGroup(furniture.id);
            if (!furnitureGroup) return;
            
            furniture.objectIds.forEach((objectId, index) => {
                if (!objectId) return;
                
                const objectMesh = this.findObjectById(objectId);
                if (!objectMesh) return;
                
                const slotPos = furniture.getSlotPosition(index);
                if (!slotPos) return;
                
                const worldPos = new THREE.Vector3(slotPos.x, slotPos.y, slotPos.z);
                furnitureGroup.localToWorld(worldPos);
                
                // Smooth transition (could use TWEEN.js if available)
                objectMesh.position.copy(worldPos);
                objectMesh.rotation.y = furniture.rotation; // Face forward with furniture
                objectMesh.userData.furnitureSlotIndex = index;
            });
            
            console.log(`ðŸª‘ Rearranged ${furniture.objectIds.length} objects on furniture`);
        }

        /**
         * Update furniture rotation (when rotated via double-tap)
         */
        async updateFurnitureRotation(furnitureId, newRotation) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) return false;
            
            // Update storage
            furniture.rotation = newRotation;
            furniture.lastModified = Date.now();
            await this.storageManager.updateFurniture(furniture);
            
            console.log(`ðŸª‘ Saved rotation for furniture ${furnitureId}: ${newRotation.toFixed(2)} rad`);
            return true;
        }

        /**
         * Update furniture position (when moved)
         */
        async updateFurniturePosition(furnitureId, newPosition) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) return false;
            
            // DIAGNOSTIC: Log furniture structure before update
            const furnitureGroup = this.visualManager.getFurnitureGroup(furnitureId);
            if (furnitureGroup) {
                console.log(`ðŸª‘ BEFORE position update - Group has ${furnitureGroup.children.length} children`);
                console.log(`ðŸª‘ Children types:`, furnitureGroup.children.map(c => c.type + (c.userData.isWireframe ? ' (wireframe)' : '')));
            }
            
            // Update visual position
            this.visualManager.updateFurniturePosition(furnitureId, newPosition);
            
            // DIAGNOSTIC: Log furniture structure after visual update
            if (furnitureGroup) {
                console.log(`ðŸª‘ AFTER visual update - Group has ${furnitureGroup.children.length} children`);
            }
            
            // Update storage
            furniture.position = newPosition;
            furniture.lastModified = Date.now();
            await this.storageManager.updateFurniture(furniture);
            
            // Update object positions (they move with furniture)
            if (furnitureGroup) {
                furniture.objectIds.forEach((objectId, index) => {
                    if (!objectId) return;
                    
                    const objectMesh = this.findObjectById(objectId);
                    if (!objectMesh) return;
                    
                    const slotPos = furniture.getSlotPosition(index);
                    if (!slotPos) return;
                    
                    // CRITICAL FIX: Objects parented to furniture use LOCAL coordinates!
                    // slotPos is already in local coordinates, so use it directly
                    // No need to convert to world - that was causing astronomical Y values
                    
                    // CRITICAL: Adjust Y position so object's BOTTOM sits on marker, not center
                    const objectHeight = objectMesh.userData?.objectHeight || 
                                       objectMesh.geometry?.parameters?.height || 2.5;
                    const targetY = slotPos.y + (objectHeight / 2); // Center = surface + half height
                    
                    objectMesh.position.set(slotPos.x, targetY, slotPos.z);
                    // Apply slot rotation if available (for amphitheatre facing outward)
                    objectMesh.rotation.y = slotPos.rotation || 0;
                    
                    // CRITICAL: Re-confirm furniture flags to prevent gravity from affecting seated objects
                    objectMesh.userData.preservePosition = true;
                    objectMesh.userData.furnitureId = furnitureId;
                    objectMesh.userData.furnitureSlotIndex = index;
                    
                    console.log(`ðŸª‘ Updated seated object ${objectId} LOCAL position on furniture ${furnitureId} slot ${index}: (${slotPos.x.toFixed(2)}, ${targetY.toFixed(2)}, ${slotPos.z.toFixed(2)})`);
                });
            }
            
            console.log(`ðŸª‘ Updated furniture position: ${furnitureId}`);
            
            // CRITICAL: Persist all seated object positions to Flutter database
            // This ensures positions survive app restart after furniture move
            setTimeout(() => {
                furniture.objectIds.forEach((objectId, slotIndex) => {
                    if (!objectId) return;
                    
                    const seatedObj = this.app.stateManager.fileObjects?.find(obj => 
                        obj.userData.id === objectId || obj.userData.fileName === objectId
                    );
                    
                    if (seatedObj && window.ObjectMovedChannel) {
                        // CRITICAL: Send WORLD position to Flutter, not local position
                        const worldPos = new window.THREE.Vector3();
                        seatedObj.getWorldPosition(worldPos);
                        
                        const isContact = seatedObj.userData.type === 'fileObject' && 
                                          seatedObj.userData.subType === 'contact';
                        const moveData = {
                            id: isContact ? `contact://${seatedObj.userData.id}` : seatedObj.userData.id,
                            x: worldPos.x,
                            y: worldPos.y,
                            z: worldPos.z,
                            furnitureId: furnitureId,  // Include furniture metadata
                            slotIndex: slotIndex   // Include slot index
                        };
                        console.log(`ðŸª‘ Persisting moved seated object: ${seatedObj.userData.fileName} at (${moveData.x.toFixed(2)}, ${moveData.y.toFixed(2)}, ${moveData.z.toFixed(2)}) on furniture ${furnitureId} slot ${slotIndex}`);
                        window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                    }
                });
            }, 150); // Delay to ensure all positions are finalized
            
            // DIAGNOSTIC: Final structure check
            if (furnitureGroup) {
                console.log(`ðŸª‘ FINAL - Group has ${furnitureGroup.children.length} children`);
            }
            return true;
        }

        /**
         * Start furniture rotation (via handle drag)
         */
        startRotation(furnitureId, startPointer) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            const furnitureGroup = this.visualManager.getFurnitureGroup(furnitureId);
            
            if (!furniture || !furnitureGroup) return false;
            
            this.rotatingFurniture = {
                id: furnitureId,
                startRotation: furniture.rotation,
                startPointer: { ...startPointer },
                centerPosition: furnitureGroup.position.clone()
            };
            
            console.log(`ðŸª‘ Started rotation for furniture ${furnitureId}`);
            return true;
        }

        /**
         * Update furniture rotation (during handle drag)
         */
        updateRotation(currentPointer) {
            if (!this.rotatingFurniture) return false;
            
            const { id, startRotation, startPointer, centerPosition } = this.rotatingFurniture;
            
            // Calculate angle change based on pointer movement
            const startAngle = Math.atan2(
                startPointer.z - centerPosition.z,
                startPointer.x - centerPosition.x
            );
            const currentAngle = Math.atan2(
                currentPointer.z - centerPosition.z,
                currentPointer.x - centerPosition.x
            );
            
            const deltaAngle = currentAngle - startAngle;
            const newRotation = startRotation + deltaAngle;
            
            // Update visual rotation
            this.visualManager.updateFurnitureRotation(id, newRotation);
            
            // Update object positions (they rotate with furniture)
            const furniture = this.storageManager.getFurniture(id);
            const furnitureGroup = this.visualManager.getFurnitureGroup(id);
            
            if (furniture && furnitureGroup) {
                furniture.objectIds.forEach((objectId, index) => {
                    if (!objectId) return;
                    
                    const objectMesh = this.findObjectById(objectId);
                    if (!objectMesh) return;
                    
                    const slotPos = furniture.getSlotPosition(index);
                    if (!slotPos) return;
                    
                    const worldPos = new window.THREE.Vector3(slotPos.x, slotPos.y, slotPos.z);
                    furnitureGroup.localToWorld(worldPos);
                    
                    // CRITICAL: Adjust Y position so object's BOTTOM sits on marker, not center
                    const objectHeight = objectMesh.userData?.objectHeight || 
                                       objectMesh.geometry?.parameters?.height || 2.5;
                    const targetY = worldPos.y + (objectHeight / 2); // Center = surface + half height
                    
                    // CRITICAL: Convert world position to local coordinates within furniture group
                    // Objects are parented to furniture group, so position must be local coordinates
                    const localPos = furnitureGroup.worldToLocal(new window.THREE.Vector3(worldPos.x, targetY, worldPos.z));
                    objectMesh.position.copy(localPos);
                    objectMesh.rotation.y = 0; // Reset rotation (furniture group handles orientation)
                    
                    // CRITICAL: Persist rotated position to Flutter database
                    // This ensures positions survive app restart after furniture rotation
                    if (window.ObjectMovedChannel) {
                        const isContact = objectMesh.userData.type === 'fileObject' && 
                                          objectMesh.userData.subType === 'contact';
                        const moveData = {
                            id: isContact ? `contact://${objectMesh.userData.id}` : objectMesh.userData.id,
                            x: objectMesh.position.x,
                            y: objectMesh.position.y,
                            z: objectMesh.position.z,
                            furnitureId: id,  // Include furniture metadata
                            slotIndex: index   // Include slot index
                        };
                        console.log(`ðŸª‘ Persisting rotated seated object: ${objectMesh.userData.fileName} at (${moveData.x.toFixed(2)}, ${moveData.y.toFixed(2)}, ${moveData.z.toFixed(2)}) on furniture ${id} slot ${index}`);
                        window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                    }
                });
            }
            
            return true;
        }

        /**
         * End furniture rotation (on handle release)
         */
        async endRotation() {
            if (!this.rotatingFurniture) return false;
            
            const { id } = this.rotatingFurniture;
            const furniture = this.storageManager.getFurniture(id);
            const furnitureGroup = this.visualManager.getFurnitureGroup(id);
            
            if (furniture && furnitureGroup) {
                // Save final rotation
                furniture.rotation = furnitureGroup.rotation.y;
                furniture.lastModified = Date.now();
                await this.storageManager.updateFurniture(furniture);
                
                console.log(`ðŸª‘ Ended rotation for furniture ${id}: ${furniture.rotation.toFixed(2)} rad`);
            }
            
            this.rotatingFurniture = null;
            return true;
        }

        /**
         * Highlight slot when object preview is active nearby
         */
        highlightNearestSlot(furnitureId, objectPosition) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            const furnitureGroup = this.visualManager.getFurnitureGroup(furnitureId);
            
            if (!furniture || !furnitureGroup) return -1;
            
            // Find nearest empty slot
            let nearestSlot = -1;
            let nearestDistance = Infinity;
            
            furniture.positions.forEach((slotPos, index) => {
                if (furniture.objectIds[index]) return; // Slot occupied
                
                const worldPos = new window.THREE.Vector3(slotPos.x, slotPos.y, slotPos.z);
                furnitureGroup.localToWorld(worldPos);
                
                const distance = worldPos.distanceTo(objectPosition);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestSlot = index;
                }
            });
            
            if (nearestSlot !== -1) {
                this.visualManager.highlightSlot(furnitureId, nearestSlot);
            }
            
            return nearestSlot;
        }

        /**
         * Clear slot highlight
         */
        clearSlotHighlight(furnitureId, slotIndex) {
            this.visualManager.clearSlotHighlight(furnitureId, slotIndex);
        }

        /**
         * Find nearest furniture slot to object position (3D distance with Y support)
         */
        findNearestFurnitureSlot(objectPosition, maxDistance = 4.0) {
            let nearestFurniture = null;
            let nearestSlotIndex = -1;
            let nearestDistance = maxDistance;
            let nearestWorldPos = null;
            
            const allFurniture = this.getAllFurniture();
            // console.log(`ðŸª‘ðŸ” SNAP SEARCH: Object at (${objectPosition.x.toFixed(2)}, ${objectPosition.y.toFixed(2)}, ${objectPosition.z.toFixed(2)}), checking ${allFurniture.length} furniture pieces, maxDistance=${maxDistance}`);
            
            allFurniture.forEach(furniture => {
                const visualElements = this.visualManager.furnitureMeshes.get(furniture.id);
                if (!visualElements) {
                    // console.log(`ðŸª‘ðŸ”   Furniture ${furniture.id}: NO VISUAL ELEMENTS`);
                    return;
                }
                
                // console.log(`ðŸª‘ðŸ”   Furniture ${furniture.id} (${furniture.type}): ${visualElements.slots.length} slots`);
                
                visualElements.slots.forEach((slot, index) => {
                    // Skip occupied slots
                    if (furniture.objectIds[index]) {
                        // console.log(`ðŸª‘ðŸ”     Slot ${index}: OCCUPIED by ${furniture.objectIds[index]}`);
                        return;
                    }
                    
                    // Get slot WORLD position (handles furniture rotation/position)
                    const worldPos = new THREE.Vector3();
                    slot.getWorldPosition(worldPos);
                    
                    // Use 2D distance (X/Z only) like path system - objects at different heights can still snap
                    const dx = objectPosition.x - worldPos.x;
                    const dz = objectPosition.z - worldPos.z;
                    const distance = Math.sqrt(dx*dx + dz*dz);
                    
                    // console.log(`ðŸª‘ðŸ”     Slot ${index}: worldPos=(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}), 2D distance=${distance.toFixed(2)}`);
                    
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestFurniture = furniture;
                        nearestSlotIndex = index;
                        nearestWorldPos = worldPos.clone();
                        // console.log(`ðŸª‘ðŸ”     âœ… NEW NEAREST: slot ${index}, distance=${distance.toFixed(2)}`);
                    }
                });
            });
            
            if (nearestFurniture) {
                console.log(`ðŸª‘ðŸ” SNAP SELECTED: Furniture ${nearestFurniture.id} slot ${nearestSlotIndex}, distance=${nearestDistance.toFixed(2)}`);
            }
            // Only log when no slot found if you need to debug
            // else {
            //     console.log(`ðŸª‘ðŸ” SNAP SELECTED: NONE (no slot within ${maxDistance} units)`);
            // }
            
            return nearestFurniture ? { furniture: nearestFurniture, slotIndex: nearestSlotIndex, distance: nearestDistance } : null;
        }
        
        /**
         * Snap object to furniture slot with visual feedback
         * @param {THREE.Object3D} objectMesh - The object to snap
         * @param {Object} snapInfo - The furniture snap information
         * @param {Boolean} manualPlacement - True if user is manually dragging (skips auto-sort)
         */
        async snapObjectToFurnitureSlot(objectMesh, snapInfo, manualPlacement = false) {
            const { furniture, slotIndex } = snapInfo;
            
            const objectId = objectMesh.userData.id || objectMesh.userData.fileData?.path;
            console.log(`ðŸª‘ðŸ“ SNAP EXECUTE: Object ${objectId} -> Furniture ${furniture.id} (${furniture.type}), slot ${slotIndex}${manualPlacement ? ' [MANUAL]' : ' [AUTO]'}`);
            
            // Check if slot is already occupied
            if (furniture.objectIds[slotIndex]) {
                console.warn(`ðŸª‘ðŸ“ SNAP ABORT: Slot ${slotIndex} already occupied by ${furniture.objectIds[slotIndex]}`);
                return false;
            }
            
            // Get slot marker's world position
            const visualElements = this.visualManager.furnitureMeshes.get(furniture.id);
            if (!visualElements || !visualElements.slots[slotIndex]) {
                console.error(`ðŸª‘ðŸ“ SNAP ERROR: No visual elements or slot ${slotIndex} for furniture ${furniture.id}`);
                return false;
            }
            
            const slot = visualElements.slots[slotIndex];
            const worldPos = new THREE.Vector3();
            slot.getWorldPosition(worldPos);
            
            console.log(`ðŸª‘ðŸ“ SNAP: Slot ${slotIndex} marker worldPos=(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
            
            // Get object ID and check if being rearranged
            const wasOnThisFurniture = objectMesh.userData.furnitureId === furniture.id;
            
            // CRITICAL: Snap object to exact marker position (X, Y, Z)
            // Elevate object above marker surface so object's BOTTOM sits flush on marker
            const objectHeight = objectMesh.userData?.objectHeight || 
                                 objectMesh.geometry?.parameters?.height || 
                                 2.5; // Default height
            const targetY = worldPos.y + (objectHeight / 2); // Object center = marker surface + half height
            
            console.log(`ðŸª‘ðŸ“ SNAP: Object height=${objectHeight.toFixed(2)}, targetY = ${worldPos.y.toFixed(2)} + ${(objectHeight/2).toFixed(2)} = ${targetY.toFixed(2)}`);
            console.log(`ðŸª‘ðŸ“ SNAP: Final world position=(${worldPos.x.toFixed(2)}, ${targetY.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
            
            // CRITICAL: Parent object to furniture group so it moves with furniture
            const furnitureGroup = visualElements.group;
            if (objectMesh.parent !== furnitureGroup) {
                // Remove from current parent (scene)
                if (objectMesh.parent) {
                    objectMesh.parent.remove(objectMesh);
                }
                // Add to furniture group
                furnitureGroup.add(objectMesh);
                console.log(`ðŸª‘ðŸ“ SNAP: Parented object to furniture group`);
            }
            
            // Convert world position to local coordinates within furniture group
            const localPos = furnitureGroup.worldToLocal(new THREE.Vector3(worldPos.x, targetY, worldPos.z));
            
            // Set object to local position (relative to furniture)
            objectMesh.position.copy(localPos);
            objectMesh.rotation.y = 0; // Reset rotation (furniture group handles orientation)
            
            console.log(`ðŸª‘ðŸ“ SNAP: Local position=(${localPos.x.toFixed(2)}, ${localPos.y.toFixed(2)}, ${localPos.z.toFixed(2)})`);
            
            // CRITICAL: Mark as furniture-seated to prevent gravity/constraint interference
            objectMesh.userData.furnitureId = furniture.id;
            objectMesh.userData.furnitureSlotIndex = slotIndex;
            objectMesh.userData.preservePosition = true;
            
            // Update fileData for persistence
            if (objectMesh.userData.fileData) {
                objectMesh.userData.fileData.x = worldPos.x;
                objectMesh.userData.fileData.y = targetY;
                objectMesh.userData.fileData.z = worldPos.z;
            }
            
            // Update furniture data
            furniture.objectIds[slotIndex] = objectId;
            await this.storageManager.updateFurniture(furniture);
            
            // Visual feedback: Flash slot blue then set to occupied
            const originalMaterial = slot.material;
            slot.material = this.visualManager.slotMaterials.active;
            setTimeout(() => {
                slot.material = this.visualManager.slotMaterials.occupied;
            }, 500);
            
            console.log(`ðŸª‘ Snapped object ${objectId} to furniture ${furniture.id} slot ${slotIndex}`);
            
            // CRITICAL: Persist position AND furniture metadata to Flutter immediately after snap
            if (window.ObjectMovedChannel) {
                const isContact = objectMesh.userData.type === 'fileObject' && 
                                  objectMesh.userData.subType === 'contact';
                const moveData = {
                    id: isContact ? `contact://${objectMesh.userData.id}` : objectMesh.userData.id,
                    x: objectMesh.position.x,
                    y: objectMesh.position.y,
                    z: objectMesh.position.z,
                    // FURNITURE METADATA: Include furniture ID and slot index so Flutter can persist the relationship
                    furnitureId: furniture.id,
                    slotIndex: slotIndex
                };
                window.ObjectMovedChannel.postMessage(JSON.stringify(moveData));
                console.log(`ðŸª‘ Persisted snap position AND furniture metadata for ${objectId}: furniture=${furniture.id}, slot=${slotIndex}`);
            }
            
            // Smart auto-sort: Only sort NEW objects from other locations, never manually placed objects
            if (furniture.autoSort && !wasOnThisFurniture && !manualPlacement) {
                console.log(`ðŸª‘ Auto-sorting NEW object ${objectId} into furniture ${furniture.id}`);
                await this.sortFurniture(furniture.id);
            } else if (wasOnThisFurniture) {
                console.log(`ðŸª‘ Object ${objectId} being rearranged manually - skipping auto-sort`);
            } else if (manualPlacement) {
                console.log(`ðŸª‘ Object ${objectId} manually placed by user - skipping auto-sort`);
            }
            
            return true;
        }
        
        /**
         * Find object mesh by ID
         */
        findObjectById(objectId) {
            if (!this.app || !this.app.stateManager || !this.app.stateManager.fileObjects) {
                return null;
            }
            
            return this.app.stateManager.fileObjects.find(obj => 
                obj.userData.id === objectId || obj.userData.fileId === objectId
            );
        }

        /**
         * Get all furniture for current world
         */
        getAllFurniture() {
            return this.storageManager.getFurnitureForWorld(this.currentWorldType);
        }

        /**
         * Get furniture by ID
         */
        getFurniture(furnitureId) {
            return this.storageManager.getFurniture(furnitureId);
        }

        /**
         * One-time cleanup: Remove duplicate objectIds from all furniture
         * Keeps only the first occurrence of each objectId per furniture piece
         * @returns {Object} Cleanup results with totals
         */
        cleanupDuplicateSlots() {
            console.log('ðŸª‘ðŸ§¹ Starting furniture duplicate slot cleanup...');
            
            const allFurniture = this.getAllFurniture();
            let totalDuplicates = 0;
            let furnitureAffected = 0;
            const details = [];

            for (const furniture of allFurniture) {
                const duplicatesRemoved = furniture.removeDuplicateSlots();
                if (duplicatesRemoved > 0) {
                    totalDuplicates += duplicatesRemoved;
                    furnitureAffected++;
                    details.push({
                        id: furniture.id,
                        typeName: furniture.typeName,
                        duplicatesRemoved: duplicatesRemoved,
                        occupiedSlotsAfter: furniture.objectIds.filter(id => id !== null).length,
                        capacity: furniture.capacity
                    });
                }
            }

            // Save updated furniture data
            if (totalDuplicates > 0) {
                this.saveFurniture();
                console.log(`ðŸª‘ðŸ§¹âœ… Cleanup complete: Removed ${totalDuplicates} duplicate(s) from ${furnitureAffected} furniture piece(s)`);
            } else {
                console.log('ðŸª‘ðŸ§¹âœ… Cleanup complete: No duplicates found');
            }

            return {
                success: true,
                totalDuplicatesRemoved: totalDuplicates,
                furnitureAffected: furnitureAffected,
                details: details
            };
        }

        /**
         * Clear object from furniture slot (called when object is picked up/moved)
         */
        async clearObjectFromSlot(furnitureId, slotIndex) {
            const furniture = this.getFurniture(furnitureId);
            if (!furniture) {
                console.warn(`ðŸª‘ Could not find furniture ${furnitureId} to clear slot`);
                return;
            }

            console.log(`ðŸª‘ Clearing slot ${slotIndex} from furniture ${furnitureId} (was: ${furniture.objectIds[slotIndex]})`);
            
            // Clear the slot
            furniture.objectIds[slotIndex] = null;
            
            // Update visual marker if available
            const furnitureMesh = this.app.stateManager.furnitureObjects?.find(f => f.userData.id === furnitureId);
            if (furnitureMesh && furnitureMesh.userData.slots && furnitureMesh.userData.slots[slotIndex]) {
                const slot = furnitureMesh.userData.slots[slotIndex];
                slot.material = this.visualManager.slotMaterials.empty;
            }
            
            // Save updated furniture data
            await this.storageManager.updateFurniture(furniture);
        }

        /**
         * Clear all stale occupied slots (cleanup for objects that weren't properly tracked)
         * Call this on world load to fix any inconsistencies
         */
        async clearAllStaleSlots() {
            console.log(`ðŸª‘ [CLEANUP] Starting stale slot cleanup...`);
            const allFurniture = this.getAllFurniture();
            let clearedCount = 0;
            let totalSlots = 0;

            for (const furniture of allFurniture) {
                totalSlots += furniture.objectIds.length;
                for (let i = 0; i < furniture.objectIds.length; i++) {
                    const occupyingId = furniture.objectIds[i];
                    if (occupyingId) {
                        // Check if the object with this ID actually exists in the scene
                        const objectExists = this.app.stateManager.fileObjects?.some(obj => 
                            obj.userData.id === occupyingId || 
                            obj.userData.fileName === occupyingId
                        );
                        
                        if (!objectExists) {
                            console.log(`ðŸª‘ [CLEANUP] Clearing stale slot ${i} on ${furniture.id} (object ${occupyingId} not found)`);
                            furniture.objectIds[i] = null;
                            clearedCount++;
                            
                            // Update visual marker if available
                            const furnitureMesh = this.app.stateManager.furnitureObjects?.find(f => f.userData.id === furniture.id);
                            if (furnitureMesh && furnitureMesh.userData.slots && furnitureMesh.userData.slots[i]) {
                                const slot = furnitureMesh.userData.slots[i];
                                slot.material = this.visualManager.slotMaterials.empty;
                            }
                        }
                    }
                }
                
                // Save if any slots were cleared
                if (clearedCount > 0) {
                    await this.storageManager.updateFurniture(furniture);
                }
            }

            console.log(`ðŸª‘ [CLEANUP] Cleared ${clearedCount} stale slots out of ${totalSlots} total slots`);
            return clearedCount;
        }

        // ============================================================================
        // PLAYBACK CONTROL METHODS
        // ============================================================================

        /**
         * Start playback on furniture - begins at first occupied slot
         */
        startFurniturePlayback(furnitureId) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.warn('ðŸª‘ Cannot start playback - furniture not found:', furnitureId);
                return false;
            }

            // Find first occupied slot
            const occupiedIndices = furniture.objectIds
                .map((id, index) => id ? index : -1)
                .filter(index => index !== -1);

            if (occupiedIndices.length === 0) {
                console.log('ðŸª‘ No objects on furniture to play');
                return false;
            }

            furniture.isPlaying = true;
            furniture.currentIndex = occupiedIndices[0];
            furniture.playedIndices = [];
            
            console.log(`ðŸª‘ Started playback on furniture ${furnitureId} at slot ${furniture.currentIndex}`);
            
            // Update marker states
            this.visualManager.updateMarkerStates(furnitureId, furniture.currentIndex, furniture.playedIndices);
            
            // Open the first media
            const objectId = furniture.objectIds[furniture.currentIndex];
            this.openFurnitureMedia(furnitureId, furniture.currentIndex, objectId);
            
            return true;
        }

        /**
         * Stop playback on furniture
         */
        stopFurniturePlayback(furnitureId) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.warn('ðŸª‘ Cannot stop playback - furniture not found:', furnitureId);
                return;
            }

            furniture.isPlaying = false;
            furniture.currentIndex = 0;
            furniture.playedIndices = [];
            
            console.log(`ðŸª‘ Stopped playback on furniture ${furnitureId}`);
            
            // Reset marker states to default
            this.visualManager.resetMarkerStates(furnitureId);
        }

        /**
         * Validate furniture objectIds - clear slots that reference deleted objects
         */
        validateFurnitureObjects(furniture) {
            if (!furniture || !furniture.objectIds) return;
            
            let clearedCount = 0;
            furniture.objectIds.forEach((objectId, index) => {
                if (objectId) {
                    // Check if this object still exists in the scene
                    const exists = this.findObjectById(objectId);
                    if (!exists) {
                        console.log(`ðŸª‘ðŸ—‘ï¸ Clearing deleted object from slot ${index}: ${objectId}`);
                        furniture.objectIds[index] = null;
                        clearedCount++;
                    }
                }
            });
            
            if (clearedCount > 0) {
                console.log(`ðŸª‘ðŸ—‘ï¸ Cleared ${clearedCount} deleted object references from furniture ${furniture.id}`);
            }
        }

        /**
         * Play next object in furniture playlist
         */
        playNext(furnitureId) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.warn('ðŸª‘ Cannot play next - furniture not found:', furnitureId);
                return false;
            }

            // CRITICAL: Validate objectIds before navigating - clear any deleted objects
            this.validateFurnitureObjects(furniture);

            if (!furniture.isPlaying) {
                console.log('ðŸª‘ Playback not active, starting from beginning');
                return this.startFurniturePlayback(furnitureId);
            }

            // Get next object using furniture's navigation logic
            const result = furniture.getNextObject();
            
            if (!result.hasNext) {
                console.log('ðŸª‘ Reached end of playlist');
                if (furniture.autoLoop) {
                    console.log('ðŸª‘ Auto-loop enabled, restarting playlist');
                    return this.startFurniturePlayback(furnitureId);
                } else {
                    this.stopFurniturePlayback(furnitureId);
                    return false;
                }
            }

            furniture.currentIndex = result.nextIndex;
            
            console.log(`ðŸª‘ Playing next: slot ${furniture.currentIndex}`);
            
            // Peek at what will be next after this (without modifying state)
            const nextResult = furniture.peekNextObject();
            const nextIndex = nextResult.hasNext ? nextResult.nextIndex : null;
            
            // Update marker states with next indicator
            this.visualManager.updateMarkerStates(furnitureId, furniture.currentIndex, furniture.playedIndices, nextIndex);
            
            // Open the media
            const objectId = furniture.objectIds[furniture.currentIndex];
            this.openFurnitureMedia(furnitureId, furniture.currentIndex, objectId);
            
            return true;
        }

        /**
         * Play previous object in furniture playlist
         */
        playPrevious(furnitureId) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.warn('ðŸª‘ Cannot play previous - furniture not found:', furnitureId);
                return false;
            }

            // CRITICAL: Validate objectIds before navigating - clear any deleted objects
            this.validateFurnitureObjects(furniture);

            if (!furniture.isPlaying) {
                console.log('ðŸª‘ Playback not active');
                return false;
            }

            // Get previous object using furniture's navigation logic
            const result = furniture.getPreviousObject();
            
            if (!result.hasPrevious) {
                console.log('ðŸª‘ Already at start of playlist');
                return false;
            }

            furniture.currentIndex = result.previousIndex;
            
            console.log(`ðŸª‘ Playing previous: slot ${furniture.currentIndex}`);
            
            // Update marker states
            this.visualManager.updateMarkerStates(furnitureId, furniture.currentIndex, furniture.playedIndices);
            
            // Open the media
            const objectId = furniture.objectIds[furniture.currentIndex];
            this.openFurnitureMedia(furnitureId, furniture.currentIndex, objectId);
            
            return true;
        }

        /**
         * Jump to specific slot (when user taps marker)
         */
        jumpToSlot(furnitureId, slotIndex) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.warn('ðŸª‘ Cannot jump to slot - furniture not found:', furnitureId);
                return false;
            }

            // Check if slot has an object
            const objectId = furniture.objectIds[slotIndex];
            if (!objectId) {
                console.log('ðŸª‘ Cannot jump to empty slot:', slotIndex);
                return false;
            }

            // Start playback if not already playing
            if (!furniture.isPlaying) {
                furniture.isPlaying = true;
                furniture.playedIndices = [];
            }

            // Reset played indices for wraparound playback from tapped position
            furniture.playedIndices = [];
            furniture.currentIndex = slotIndex;
            
            console.log(`ðŸª‘ Jumped to slot ${slotIndex} on furniture ${furnitureId}`);
            
            // Peek at what will be next (without modifying state)
            const nextResult = furniture.peekNextObject();
            const nextIndex = nextResult.hasNext ? nextResult.nextIndex : null;
            
            // Update marker states with next indicator
            this.visualManager.updateMarkerStates(furnitureId, furniture.currentIndex, furniture.playedIndices, nextIndex);
            
            // Open the media
            this.openFurnitureMedia(furnitureId, slotIndex, objectId);
            
            return true;
        }

        /**
         * Open media for furniture object (helper method)
         */
        openFurnitureMedia(furnitureId, slotIndex, objectId) {
            console.log(`ðŸª‘ Opening media for slot ${slotIndex}, object ${objectId}`);
            
            // Find the object mesh
            const objectMesh = this.findObjectById(objectId);
            if (!objectMesh) {
                console.warn('ðŸª‘ Object not found:', objectId);
                return;
            }

            // Store active furniture playback info for auto-advance
            if (window.app) {
                window.app.activeFurniturePlayback = {
                    furnitureId: furnitureId,
                    slotIndex: slotIndex,
                    objectId: objectId
                };
                console.log('ðŸª‘ Set activeFurniturePlayback:', window.app.activeFurniturePlayback);
            }

            // Open the media preview using the media preview manager
            if (window.mediaPreviewManager) {
                console.log('ðŸª‘ Opening media preview for object:', objectId);
                window.mediaPreviewManager.togglePreview(objectMesh.userData, objectMesh);
            } else {
                console.warn('ðŸª‘ mediaPreviewManager not available');
            }
        }

        /**
         * Store furniture state for undo
         */
        storeFurnitureStateForUndo(furnitureId) {
            const furniture = this.storageManager.getFurniture(furnitureId);
            if (!furniture) {
                console.warn('ðŸª‘ Furniture not found for undo backup:', furnitureId);
                return null;
            }

            // Return furniture data that can be used for restoration
            const state = {
                id: furniture.id,
                type: furniture.type,
                name: furniture.name,
                worldType: furniture.worldType,
                createdAt: furniture.createdAt,
                lastModified: furniture.lastModified,
                position: { ...furniture.position },
                rotation: furniture.rotation,
                style: furniture.style,
                sortingCriteria: furniture.sortingCriteria,
                capacity: furniture.capacity,
                geometryParams: { ...furniture.geometryParams },
                positions: furniture.positions.map(p => ({ ...p })),
                objectIds: [...furniture.objectIds],
                isVisible: furniture.isVisible
            };

            console.log('ðŸª‘ Stored furniture state for undo:', furnitureId);
            return state;
        }

        /**
         * Restore furniture from undo state
         */
        async restoreFurnitureFromUndo(furnitureState) {
            if (!furnitureState) {
                console.error('ðŸª‘ Invalid furniture state for restoration');
                return false;
            }

            console.log('ðŸª‘ Restoring furniture from undo:', furnitureState.id);

            // Recreate the furniture
            const furniture = new window.Furniture(furnitureState);
            
            // Add to storage
            const added = await this.storageManager.addFurniture(furniture);
            if (!added) {
                console.error('ðŸª‘ Failed to restore furniture to storage');
                return false;
            }

            // Add visualization
            await this.visualManager.addFurniture(furniture);

            // Add to scene's fileObjects for interaction
            if (this.app && this.app.stateManager) {
                const furnitureGroup = this.visualManager.getFurnitureGroup(furniture.id);
                if (furnitureGroup && !this.app.stateManager.fileObjects.includes(furnitureGroup)) {
                    this.app.stateManager.fileObjects.push(furnitureGroup);
                }
            }

            // CRITICAL: Notify Flutter about restored furniture so it can track it in state
            if (window.ObjectActionChannel) {
                const messageData = {
                    action: 'furnitureCreated',
                    id: furniture.id,
                    name: furniture.name,
                    type: 'furniture',
                    furnitureType: furniture.type,
                    worldType: furniture.worldType
                };
                console.log('ðŸª‘ Sending restored furniture notification to Flutter:', messageData);
                window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
            }

            console.log('ðŸª‘ Furniture restored successfully:', furniture.id);
            return true;
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    
    window.FurnitureManager = FurnitureManager;

    // Auto-initialize when app is ready
    const initializeFurnitureManager = async () => {
        console.log('ðŸª‘ DEBUG: initializeFurnitureManager called - window.app exists:', !!window.app, 'furnitureManager exists:', !!(window.app && window.app.furnitureManager));
        
        if (window.app && !window.app.furnitureManager) {
            console.log('ðŸª‘ Creating new FurnitureManager...');
            window.app.furnitureManager = new FurnitureManager(window.app);
            console.log('ðŸª‘ Initializing furniture manager...');
            await window.app.furnitureManager.initialize();
            console.log('ðŸª‘ FurnitureManager attached to app');
            
            // Hook into global deletion/restoration system
            setupFurnitureDeletionHandlers();
            
            // Note: Default furniture creation moved to mainApplication.js
            // It runs after file restoration (same timing as default links)
        } else if (!window.app) {
            console.log('ðŸª‘ window.app not ready yet, retrying in 100ms...');
            setTimeout(initializeFurnitureManager, 100);
        } else if (window.app.furnitureManager) {
            console.warn('ðŸª‘ FurnitureManager already exists, skipping initialization');
        }
    };

    // Setup global handlers for furniture deletion and restoration
    function setupFurnitureDeletionHandlers() {
        // Extend selectObjectForMoveCommand to support furniture
        const originalSelectForMove = window.selectObjectForMoveCommand;
        
        window.selectObjectForMoveCommand = function(objectId) {
            // Check if this is a furniture ID
            if (objectId && objectId.startsWith('furniture_')) {
                console.log('ðŸª‘ Furniture move requested:', objectId);
                
                if (window.app?.furnitureManager && window.app?.interactionManager) {
                    const furnitureGroup = window.app.furnitureManager.visualManager.getFurnitureGroup(objectId);
                    if (furnitureGroup) {
                        // Temporarily add furniture to fileObjects for move system
                        const stateManager = window.app.stateManager;
                        if (!stateManager.fileObjects.includes(furnitureGroup)) {
                            stateManager.fileObjects.push(furnitureGroup);
                        }
                        
                        // Now call original move handler
                        window.app.interactionManager.selectObjectForMove(objectId);
                    }
                }
                
                return;
            }
            
            // Call original handler for non-furniture objects
            if (originalSelectForMove) {
                return originalSelectForMove(objectId);
            }
        };

        // Extend highlightObjectForDeleteConfirmation to support furniture
        const originalHighlightForDelete = window.highlightObjectForDeleteConfirmation;
        
        window.highlightObjectForDeleteConfirmation = function(objectId) {
            // Check if this is a furniture ID
            if (objectId && objectId.startsWith('furniture_')) {
                console.log('ðŸª‘ Furniture delete highlight requested:', objectId);
                
                if (window.app?.furnitureManager && window.app?.interactionManager) {
                    const furnitureGroup = window.app.furnitureManager.visualManager.getFurnitureGroup(objectId);
                    if (furnitureGroup) {
                        // Temporarily add furniture to fileObjects for highlight system
                        const stateManager = window.app.stateManager;
                        if (!stateManager.fileObjects.includes(furnitureGroup)) {
                            stateManager.fileObjects.push(furnitureGroup);
                        }
                        
                        // Now call original highlight handler
                        window.app.interactionManager.highlightObjectForDelete(objectId);
                    }
                }
                
                return;
            }
            
            // Call original handler for non-furniture objects
            if (originalHighlightForDelete) {
                return originalHighlightForDelete(objectId);
            }
        };
        
        // Extend removeObjectByIdJS to support furniture
        const originalRemoveObjectById = window.removeObjectByIdJS;
        
        window.removeObjectByIdJS = function(objectId) {
            // Check if this is a furniture ID
            if (objectId && objectId.startsWith('furniture_')) {
                console.log('ðŸª‘ Furniture deletion requested via removeObjectByIdJS:', objectId);
                
                if (window.app?.furnitureManager) {
                    const furniture = window.app.furnitureManager.getFurniture(objectId);
                    const furnitureGroup = window.app.furnitureManager.visualManager.getFurnitureGroup(objectId);
                    
                    // CRITICAL: Notify Flutter BEFORE deletion for undo snackbar
                    if (window.ObjectActionChannel && furniture) {
                        const furnitureName = furniture.name || 'Furniture';
                        const messageData = {
                            action: 'objectDeleted',
                            id: objectId,
                            name: furnitureName,
                            type: 'furniture' // Explicitly mark as furniture
                        };
                        console.log('ðŸª‘ Sending furniture deletion notification to Flutter (BEFORE deletion):', messageData);
                        window.ObjectActionChannel.postMessage(JSON.stringify(messageData));
                    }
                    
                    if (furnitureGroup) {
                        // Call deletion handler first (stores undo state)
                        if (window.handleObjectDeletion) {
                            window.handleObjectDeletion(objectId, furnitureGroup);
                        }
                    }
                    
                    // Delete the furniture AFTER notification
                    window.app.furnitureManager.deleteFurniture(objectId);
                }
                
                return;
            }
            
            // Call original handler for non-furniture objects
            if (originalRemoveObjectById) {
                return originalRemoveObjectById(objectId);
            }
        };

        // Extend global deletion handler to support furniture
        const originalHandleObjectDeletion = window.handleObjectDeletion;
        
        window.handleObjectDeletion = function(objectId, objectData) {
            // Check if this is a furniture object
            if (objectData && objectData.userData && (objectData.userData.isFurniture || objectData.userData.type === 'furniture')) {
                const furnitureId = objectData.userData.furnitureId || objectData.userData.id;
                console.log('ðŸª‘ Furniture deletion detected:', furnitureId);
                
                // Store state for undo
                if (window.app?.furnitureManager) {
                    const furnitureState = window.app.furnitureManager.storeFurnitureStateForUndo(furnitureId);
                    // Store in a global undo map for furniture
                    if (!window._furnitureUndoStates) window._furnitureUndoStates = new Map();
                    window._furnitureUndoStates.set(furnitureId, furnitureState);
                }
                
                return; // Furniture deletion is handled by furnitureManager.deleteFurniture()
            }
            
            // Call original handler for non-furniture objects
            if (originalHandleObjectDeletion) {
                return originalHandleObjectDeletion(objectId, objectData);
            }
        };

        // Extend global restoration handler to support furniture
        const originalRestoreObjectById = window.restoreObjectById;
        
        window.restoreObjectById = async function(fileData) {
            // Check if this is a furniture restoration
            // Flutter sends: { path: 'furniture_xxx', extension: 'furniture', ... }
            const isFurnitureRestoration = fileData && (
                fileData.isFurniture || 
                fileData.type === 'furniture' ||
                fileData.extension === 'furniture' ||
                (fileData.path && fileData.path.startsWith('furniture_'))
            );
            
            if (isFurnitureRestoration) {
                const furnitureId = fileData.id || fileData.path;
                console.log('ðŸª‘ Furniture restoration requested:', furnitureId);
                
                // Try to restore from undo states
                if (window._furnitureUndoStates && window._furnitureUndoStates.has(furnitureId)) {
                    const furnitureState = window._furnitureUndoStates.get(furnitureId);
                    if (window.app?.furnitureManager) {
                        const success = await window.app.furnitureManager.restoreFurnitureFromUndo(furnitureState);
                        if (success) {
                            window._furnitureUndoStates.delete(furnitureId);
                            console.log('ðŸª‘ Furniture restored successfully:', furnitureId);
                            return true;
                        }
                    }
                }
                
                console.warn('ðŸª‘ Furniture restoration failed - no undo state found:', furnitureId);
                return false;
            }
            
            // Call original handler for non-furniture objects
            if (originalRestoreObjectById) {
                return originalRestoreObjectById(fileData);
            }
            
            return false;
        };

        console.log('ðŸª‘ Furniture deletion/restoration handlers registered');
    }

    // Export for explicit initialization
    window.setupFurnitureDeletionHandlers = setupFurnitureDeletionHandlers;

    // Start initialization after a brief delay
    setTimeout(initializeFurnitureManager, 600); // Slight delay after path manager

    console.log('âœ… Furniture Manager loaded');
})();



