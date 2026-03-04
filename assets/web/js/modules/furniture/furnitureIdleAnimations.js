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
    
    console.log('🔴🔴🔴 ANIMATION MODULE IIFE STARTED 🔴🔴🔴');

    console.log('🎨 Loading Furniture Idle Animations Module...');
    console.log('🎨 THREE.js available:', typeof window.THREE !== 'undefined');
    console.log('🎨 FURNITURE_TYPES available:', typeof window.FURNITURE_TYPES !== 'undefined');
    
    console.log('🔴 About to define FurnitureIdleAnimationManager class...');

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
                    ambientIntensity: 0.6,       // Balanced: visible glow without covering texture
                    spotIntensity: 1.2,          // Bright spotlight
                    spotOpacity: 0.8,            // High spotlight opacity
                    pulseSpeed: 4.0,             // Slow breathing pulse
                    sweepSpeed: 6.0,             // Moderate spotlight movement
                    numSpotlights: 3,            // Three crossing spots
                    spotRadius: 2.5              // Larger spotlight circle for visibility
                },
                stage_large: {
                    ambientColor: 0x6B2FFF,      // Deep purple ambient
                    spotColor: 0xFFFACD,         // Lemon chiffon (warm white/yellow)
                    ambientIntensity: 0.7,       // Balanced: visible glow without covering texture
                    spotIntensity: 2.5,          // VERY bright spotlights
                    spotOpacity: 0.8,            // High spotlight opacity
                    pulseSpeed: 4.0,             // Slow breathing pulse
                    sweepSpeed: 8.0,             // Slower sweep for large stage (higher = slower)
                    numSpotlights: 3,            // Three roving spots
                    spotRadius: 3.5              // Larger spotlight circle for big stage
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
            
            console.log('🎨 Furniture Idle Animation Manager initialized (with material preservation)');
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
            if (spotlights && window.app && window.app.scene) {
                spotlights.forEach(spotlight => {
                    window.app.scene.remove(spotlight);
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
                console.log('🎨 [IDLE-ANIM] Animations disabled');
                return;
            }
            if (!visualManager || !visualManager.activeFurniture || !visualManager.furnitureMeshes) {
                console.log('🎨 [IDLE-ANIM] visualManager missing:', !!visualManager, !!(visualManager && visualManager.activeFurniture), !!(visualManager && visualManager.furnitureMeshes));
                return;
            }
            
            // Log every 300 frames (~5 seconds at 60fps)
            if (!this._frameCount) this._frameCount = 0;
            this._frameCount++;
            
            if (this._frameCount % 300 === 0) {
                // console.log(`🎨 [IDLE-ANIM] Updating ${visualManager.activeFurniture.size} furniture pieces`);
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
                
                // Log furniture type ONCE per furniture piece
                console.log(`🎨 NEW FURNITURE: type="${furniture.type}", id=${furnitureId}`);
                
                // Preserve materials for all structure meshes
                visualElements.structure.forEach(mesh => this.preserveMaterial(mesh));
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
                    if (!this._loggedStage) {
                        console.log('🎨 STAGE MATCH: stage_small');
                        this._loggedStage = true;
                    }
                    this.animateStageSweep(visualElements.structure, time, this.params.stage_small, furnitureId);
                    break;
                    
                case 'stage_large':  // Stage uses string type
                case window.FURNITURE_TYPES.STAGE_LARGE:
                    if (!this._loggedStage) {
                        console.log('🎨 STAGE MATCH: stage_large');
                        this._loggedStage = true;
                    }
                    this.animateStageSweep(visualElements.structure, time, this.params.stage_large, furnitureId);
                    break;
                    
                case window.FURNITURE_TYPES.AMPHITHEATRE:
                    this.animateAmphitheatreRainbow(visualElements.structure, time, this.params.amphitheatre);
                    break;
                    
                default:
                    if (!this._unknownTypes) this._unknownTypes = new Set();
                    if (!this._unknownTypes.has(furniture.type)) {
                        this._unknownTypes.add(furniture.type);
                        console.log(`🎨 [IDLE-ANIM] Unknown furniture type: ${furniture.type} for ${furnitureId}`);
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
            // Log every 300 frames (~5 seconds) to verify animation is running without cluttering console
            if (!this._sweepFrameCount) this._sweepFrameCount = 0;
            this._sweepFrameCount++;
            if (this._sweepFrameCount % 300 === 0) {
                // console.log(`🎨 STAGE ANIMATION RUNNING for ${furnitureId} (frame ${this._sweepFrameCount})`);
            }
            
            if (!this._loggedSweep) {
                console.log('🎨 animateStageSweep CALLED:', { structures: structures.length, params });
                this._loggedSweep = true;
            }
            if (structures.length === 0) return;
            
            const pulseCycle = (time / params.pulseSpeed) % 1.0;
            const numSpotlights = params.numSpotlights || 3;
            
            // Get or create spotlight geometry
            if (!this.spotlightGeometry.has(furnitureId)) {
                console.log(`🎨 [SPOTLIGHT INIT] Attempting to create spotlights for ${furnitureId}, structures: ${structures.length}`);
                this.createSpotlightGeometry(furnitureId, structures, numSpotlights, params);
                
                // Check if creation succeeded
                if (this.spotlightGeometry.has(furnitureId)) {
                    const created = this.spotlightGeometry.get(furnitureId);
                    console.log(`✅ [SPOTLIGHT INIT] Successfully created ${created.length} spotlights for ${furnitureId}`);
                } else {
                    console.log(`❌ [SPOTLIGHT INIT] Failed to create spotlights for ${furnitureId}`);
                }
            }
            
            const spotlights = this.spotlightGeometry.get(furnitureId);
            if (!spotlights) return;
            if (!this._loggedSpotlights) {
                console.log('🎨 SPOTLIGHTS EXIST:', spotlights.length);
                this._loggedSpotlights = true;
            }
            
            // Breathing purple pulse for stage structure (subtle ambient)
            const pulseIntensity = params.ambientIntensity * (0.7 + 0.3 * Math.sin(pulseCycle * Math.PI * 2));
            
            structures.forEach((mesh, idx) => {
                if (!mesh || !mesh.material) return;
                // Skip spotlights (they don't have emissive property)
                if (mesh.userData && mesh.userData.isSpotlight) return;
                // Check if material has emissive property (spotlights use MeshBasicMaterial which doesn't)
                if (!mesh.material.emissive) return;
                
                mesh.material.emissive.setHex(params.ambientColor);
                mesh.material.emissiveIntensity = pulseIntensity;
            });
            
            // Calculate stage bounds from ALL structures to find actual stage area
            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            structures.forEach(struct => {
                if (struct && struct.position) {
                    minX = Math.min(minX, struct.position.x);
                    maxX = Math.max(maxX, struct.position.x);
                    minZ = Math.min(minZ, struct.position.z);
                    maxZ = Math.max(maxZ, struct.position.z);
                }
            });
            
            // Use marker Y position - markers are at height + 0.5 (1.5 + 0.5 = 2.0 for stage_small)
            // This is the exact surface where performers stand
            const stageY = 2.0; // Marker surface Y coordinate
            
            // Calculate actual stage dimensions
            const stageWidth = maxX - minX;
            const stageDepth = maxZ - minZ;
            const fadeDistance = Math.max(stageWidth, stageDepth) * 0.3;
            
            // Determine which axis the stage extends along
            const useZAxis = stageDepth > stageWidth;
            
            // Update spotlight positions - each follows different pattern
            spotlights.forEach((spotlight, index) => {
                if (!spotlight || !spotlight.material) return;
                
                // Different speed and direction for each spotlight
                const speedMult = 1.0 + (index * 0.3);
                const sweepTime = (time / params.sweepSpeed) * speedMult;
                
                // Spotlight 1: Left to right
                // Spotlight 2: Right to left (offset phase)
                // Spotlight 3: Front to back diagonal
                let x, z;
                
                if (index === 0) {
                    // Left to right across stage width
                    const phase = sweepTime % 1.0;
                    x = minX + (maxX - minX) * phase;
                    z = minZ + (maxZ - minZ) * 0.3; // 30% back from front
                } else if (index === 1) {
                    // Right to left (reverse)
                    const phase = (sweepTime + 0.5) % 1.0;
                    x = minX + (maxX - minX) * (1.0 - phase);
                    z = minZ + (maxZ - minZ) * 0.7; // 70% back from front
                } else {
                    // Diagonal crossing
                    const phase = (sweepTime + 0.25) % 1.0;
                    x = minX + (maxX - minX) * phase;
                    z = minZ + (maxZ - minZ) * phase;
                }
                
                spotlight.position.set(x, stageY, z);
                
                // Fade in/out at edges for smooth appearance using the correct axis
                let distFromStart, distFromEnd;
                if (useZAxis) {
                    // Stage extends along Z-axis (most common)
                    distFromStart = Math.abs(z - minZ);
                    distFromEnd = Math.abs(maxZ - z);
                } else {
                    // Stage extends along X-axis
                    distFromStart = Math.abs(x - minX);
                    distFromEnd = Math.abs(maxX - x);
                }
                
                const edgeFade = Math.min(
                    distFromStart / fadeDistance,
                    distFromEnd / fadeDistance,
                    1.0
                );
                const baseOpacity = params.spotOpacity || 0.5;  // Use new spotOpacity param or default 0.5
                spotlight.material.opacity = baseOpacity * edgeFade;
            });
        }
        
        /**
         * Create circular spotlight geometry for stage
         */
        createSpotlightGeometry(furnitureId, structures, numSpotlights, params) {
            if (!window.app || !window.app.scene || structures.length === 0) return;
            
            // Get furniture group to add spotlights as children
            const furnitureGroup = structures[0]?.parent;
            if (!furnitureGroup) {
                console.log(`⚠️ Cannot create spotlights: no furniture group found`);
                return;
            }
            
            // Calculate stage bounds from ALL structures to find actual stage area
            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            structures.forEach(struct => {
                if (struct && struct.position) {
                    minX = Math.min(minX, struct.position.x);
                    maxX = Math.max(maxX, struct.position.x);
                    minZ = Math.min(minZ, struct.position.z);
                    maxZ = Math.max(maxZ, struct.position.z);
                }
            });
            
            // Use marker Y position - markers are at height + 0.5 (1.5 + 0.5 = 2.0 for stage_small)
            // This is the exact surface where performers stand
            const stageY = 2.0; // Marker surface Y coordinate
            const centerX = (minX + maxX) / 2;
            const centerZ = (minZ + maxZ) / 2;
            
            const spotlights = [];
            const radius = params.spotRadius || 1.5;
            
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
                    depthWrite: false,
                    blending: this.THREE.AdditiveBlending  // Additive blend for bright spotlight effect
                });
                
                const spotlight = new this.THREE.Mesh(geometry, material);
                spotlight.rotation.x = Math.PI / 2; // Lay flat on stage, facing upward
                spotlight.userData.isSpotlight = true;
                spotlight.userData.furnitureId = furnitureId;
                
                // Set initial position on stage (spread across stage area)
                const initialX = minX + (maxX - minX) * (i / numSpotlights);
                const initialZ = centerZ;
                spotlight.position.set(initialX, stageY, initialZ);
                
                console.log(`🎨 Spotlight ${i}: pos=(${initialX.toFixed(2)}, ${stageY.toFixed(2)}, ${initialZ.toFixed(2)}), radius=${radius}, color=${params.spotColor.toString(16)}`);
                
                spotlights.push(spotlight);
                // Add as child of furniture group so it's auto-removed with furniture
                furnitureGroup.add(spotlight);
            }
            
            console.log(`🎨 Created and added ${spotlights.length} spotlights to furniture group`);
            this.spotlightGeometry.set(furnitureId, spotlights);
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
            
            // Remove spotlights if they exist
            if (this.spotlightGeometry.has(furnitureId)) {
                const spotlights = this.spotlightGeometry.get(furnitureId);
                spotlights.forEach(spotlight => {
                    if (spotlight.parent) spotlight.parent.remove(spotlight);
                });
                this.spotlightGeometry.delete(furnitureId);
            }            
            // Mark as inactive
            state.isActive = false;            
            // Mark as inactive
            state.isActive = false;
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
            console.log(`🎨 Idle animations ${enabled ? 'enabled' : 'disabled'}`);
        }

        /**
         * Cleanup - remove animation states
         */
        dispose() {
            this.animationStates.clear();
            console.log('🎨 Furniture Idle Animation Manager disposed');
        }
    }

    // ============================================================================
    // EXPORT TO GLOBAL SCOPE
    // ============================================================================
    
    console.log('🔴 About to export FurnitureIdleAnimationManager to window...');
    window.FurnitureIdleAnimationManager = FurnitureIdleAnimationManager;
    console.log('🔴 Export complete!');
    
    console.log('🎨 Furniture Idle Animations Module loaded successfully');
    console.log('🎨 FurnitureIdleAnimationManager exported to window:', typeof window.FurnitureIdleAnimationManager);
    
    console.log('🔴🔴🔴 ANIMATION MODULE IIFE COMPLETED 🔴🔴🔴');

})();
