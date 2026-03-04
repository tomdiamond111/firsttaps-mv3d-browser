/**
 * TROPICAL PARADISE WORLD TEMPLATE (Premium)
 * A premium world template featuring a tropical beach environment with paradise elements
 * Uses Green Plane-style movement constraints and SimpleWorldTemplate framework
 * 
 * Features:
 * - Sandy beach ground plane with tropical colors
 * - Palm trees with coconuts and swaying fronds
 * - Animated water with ripples
 * - Rocky cliffs and lush hills
 * - Tropical sky gradients
 * - Beach decorations and sun
 */

(function() {
    'use strict';
    
    console.log('🌴 Loading Tropical Paradise World Template...');

    /**
     * Tropical Paradise World Template Configuration
     */
    const TropicalParadiseConfig = {
        id: 'tropical-paradise',
        displayName: 'Tropical Paradise',
        description: 'Beautiful tropical beach with palm trees and azure waters',
        menuIcon: 'landscape', // Flutter icon for menu
        isPremium: true,
        bundle: 'premium',
        category: 'environment',
        
        // Auto-integration configuration
        fileZones: {
            inherits: 'green-plane', // Use Green Plane-style file zones
            type: 'ground-level',
            customizations: {
                // Could add tropical-specific zone customizations here
            }
        },
        
        // Technical metadata
        baseTemplate: 'SimpleWorldTemplate',
        complexity: 'medium',
        memoryUsage: 'medium',
        renderingLoad: 'medium',
        
        // Tropical paradise lighting - warm bright beach sunlight
        lighting: {
            ambientLightColor: 0xFFF8DC,    // Cornsilk - warm tropical ambient
            ambientLightIntensity: 0.8,
            directionalLightColor: 0xFFFFE0, // Light yellow sunlight
            directionalLightIntensity: 1.0
        },
        
        // Tropical atmosphere - clear tropical air
        fog: {
            color: 0x87CEEB,  // Sky blue fog
            near: 200,
            far: 400
        },
        
        backgroundColor: 0x87CEEB, // Sky blue background
        
        // Ground plane configuration (sandy beach)
        groundPlane: {
            size: 300,
            color: 0xF5DEB3,  // Wheat/sandy beach color
            position: { x: 0, y: -0.01, z: 0 }
        },
        
        // Movement constraints (Green Plane style)
        constraints: {
            requiresSupport: true,  // Objects must sit on ground or other objects (like Green Plane)
            allowedStackingDirections: ['top'], // Only stack on top (like Green Plane)
            worldBoundaries: {
                x: { min: -150, max: 150 },
                y: { min: 0, max: 150 },  // Ground level at 0, reasonable stacking limit
                z: { min: -150, max: 150 }
            }
        },
        
        // Camera settings
        camera: {
            minDistance: 1.0,
            maxDistance: 120.0,
            enablePan: true,
            enableZoom: true,
            enableRotate: true
        },
        
        // Home view (match green plane camera settings)
        homeView: {
            x: 0,
            y: 1,      // Landscape default
            z: -13
        },
        
        homeViewTarget: {
            x: 0,
            y: 5,
            z: -15
        },
        
        // Custom setup function
        setupFunction: function() {
            console.log('�️ Setting up Tropical Paradise Beach world...');
            
            try {
                // Initialize arrays for tracking different elements
                if (!this.beachElements) this.beachElements = [];
                if (!this.forestElements) this.forestElements = [];
                if (!this.cliffElements) this.cliffElements = [];
                if (!this.palmTrees) this.palmTrees = [];
                if (!this.decorativeElements) this.decorativeElements = [];
                if (!this.tropicalElements) this.tropicalElements = [];
                if (!this.animationMixers) this.animationMixers = [];
                
                // Create the tropical environment in layers
                this.createTropicalSky();
                this.createBeachSand();
                this.createOceanWater();
                this.createLushForestRing();
                this.createDramaticCliffs();
                this.createPalmTreeGroves();
                this.createTropicalSun();
                this.createBeachDecorations();
                this.createTropicalBirds();
                
                console.log('�️ Tropical Paradise Beach world setup complete!');
                
            } catch (error) {
                console.error('🌴 Error setting up Tropical Paradise:', error);
                // Fallback to basic environment
                this.createBasicTropical();
            }
        }
    };

    /**
     * Tropical Paradise World Template Class
     * Extends SimpleWorldTemplate with tropical-specific functionality
     */
    const TropicalParadiseWorldTemplate = SimpleWorldTemplate.createFromConfig(TropicalParadiseConfig);
    
    // Add tropical-specific methods to the prototype
    // === BEACH ENVIRONMENT CREATION METHODS ===
    
    TropicalParadiseWorldTemplate.prototype.createBeachSand = function() {
        try {
            console.log('🏖️ Creating white sand beach...');
            
            // Main beach area - circular sandy beach
            const beachGeometry = new this.THREE.CircleGeometry(60, 32);
            const beachMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0xF5DEB3, // Sandy beige
                transparent: true,
                opacity: 0.9
            });
            
            const beach = new this.THREE.Mesh(beachGeometry, beachMaterial);
            beach.rotation.x = -Math.PI / 2;
            beach.position.y = 0.1;
            beach.userData.templateObject = true;
            this.addTrackedObject(beach, 'mainBeach');
            this.beachElements.push(beach);
            
            // Add beach texture with small sand mounds
            for (let i = 0; i < 15; i++) {
                const moundGeometry = new this.THREE.SphereGeometry(2 + Math.random() * 2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
                const moundMaterial = new this.THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Burlywood
                const mound = new this.THREE.Mesh(moundGeometry, moundMaterial);
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 30;
                mound.position.set(
                    Math.cos(angle) * distance,
                    0.2,
                    Math.sin(angle) * distance
                );
                mound.userData.templateObject = true;
                this.addTrackedObject(mound, `sandMound_${i}`);
                this.beachElements.push(mound);
            }
            
        } catch (error) {
            console.error('🏖️ Error creating beach sand:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createOceanWater = function() {
        try {
            console.log('🌊 Creating realistic ocean water...');
            
            // Create animated ocean with advanced shader
            const oceanGeometry = new this.THREE.PlaneGeometry(400, 400, 64, 64);
            
            const oceanMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    deepWater: { value: new this.THREE.Color(0x006994) },
                    shallowWater: { value: new this.THREE.Color(0x40E0D0) },
                    foamColor: { value: new this.THREE.Color(0xFFFFFF) },
                    waveHeight: { value: 0.8 },
                    waveSpeed: { value: 1.2 }
                },
                vertexShader: `
                    uniform float time;
                    uniform float waveHeight;
                    uniform float waveSpeed;
                    varying vec2 vUv;
                    varying float vElevation;
                    varying vec3 vPosition;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        
                        vec3 pos = position;
                        
                        // Multiple wave layers for realistic ocean
                        float wave1 = sin(pos.x * 0.02 + time * waveSpeed) * waveHeight;
                        float wave2 = sin(pos.y * 0.015 + time * waveSpeed * 0.8) * waveHeight * 0.7;
                        float wave3 = sin((pos.x + pos.y) * 0.025 + time * waveSpeed * 1.5) * waveHeight * 0.4;
                        float wave4 = sin(pos.x * 0.05 + pos.y * 0.03 + time * waveSpeed * 2.0) * waveHeight * 0.2;
                        
                        pos.z += wave1 + wave2 + wave3 + wave4;
                        vElevation = wave1 + wave2 + wave3 + wave4;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 deepWater;
                    uniform vec3 shallowWater;
                    uniform vec3 foamColor;
                    varying vec2 vUv;
                    varying float vElevation;
                    varying vec3 vPosition;
                    
                    void main() {
                        // Distance from center (beach)
                        float distanceFromCenter = length(vPosition.xy);
                        
                        // Water depth effect - shallow near beach, deep far away
                        float depthFactor = smoothstep(60.0, 200.0, distanceFromCenter);
                        vec3 waterColor = mix(shallowWater, deepWater, depthFactor);
                        
                        // Foam on wave peaks
                        float foamMix = smoothstep(0.3, 0.8, vElevation);
                        vec3 finalColor = mix(waterColor, foamColor, foamMix * 0.4);
                        
                        // Transparency - more transparent near shore
                        float alpha = 0.7 + depthFactor * 0.2;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                side: this.THREE.DoubleSide
            });
            
            this.oceanPlane = new this.THREE.Mesh(oceanGeometry, oceanMaterial);
            this.oceanPlane.rotation.x = -Math.PI / 2;
            this.oceanPlane.position.y = -0.5;
            this.oceanPlane.userData.templateObject = true;
            this.oceanPlane.userData.isAnimated = true;
            this.oceanPlane.userData.oceanMaterial = oceanMaterial;
            
            this.addTrackedObject(this.oceanPlane, 'tropicalOcean');
            
        } catch (error) {
            console.error('🌊 Error creating ocean water:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createLushForestRing = function() {
        try {
            console.log('🌲 Creating lush tropical forest crescent...');
            
            // Create a crescent-shaped forest (like a moon), open toward the ocean (negative Z)
            const forestPositions = [];
            const numForestSections = 10;
            const forestRadius = 80;
            
            // Create forest sections from -120 degrees to +120 degrees (240 degree arc)
            // This leaves the ocean side (negative Z) open
            for (let i = 0; i < numForestSections; i++) {
                const startAngle = -Math.PI * 2/3; // -120 degrees
                const endAngle = Math.PI * 2/3;   // +120 degrees
                const angle = startAngle + (i / (numForestSections - 1)) * (endAngle - startAngle);
                
                forestPositions.push({
                    x: Math.cos(angle) * forestRadius,
                    z: Math.sin(angle) * forestRadius,
                    width: 25 + Math.random() * 10,
                    depth: 20 + Math.random() * 10,
                    height: 12 + Math.random() * 8
                });
            }
            
            forestPositions.forEach((pos, index) => {
                // Create forest base mound
                const forestGeometry = new this.THREE.SphereGeometry(pos.width, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const forestMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22 // Forest green
                });
                const forestBase = new this.THREE.Mesh(forestGeometry, forestMaterial);
                
                forestBase.position.set(pos.x, pos.height * 0.3, pos.z);
                forestBase.scale.y = pos.height / pos.width;
                forestBase.userData.templateObject = true;
                this.addTrackedObject(forestBase, `forestBase_${index}`);
                this.forestElements.push(forestBase);
                
                // Add multiple trees on each forest section
                for (let t = 0; t < 4; t++) {
                    const treeHeight = 15 + Math.random() * 10;
                    
                    // Tree trunk
                    const trunkGeometry = new this.THREE.CylinderGeometry(1, 1.5, treeHeight * 0.4);
                    const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
                    
                    // Tree canopy - multiple spheres for natural look
                    const canopyGeometry = new this.THREE.SphereGeometry(4 + Math.random() * 3, 12, 8);
                    const canopyMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: 0x006400 // Dark green
                    });
                    const canopy = new this.THREE.Mesh(canopyGeometry, canopyMaterial);
                    
                    // Position within forest section
                    const treeAngle = Math.random() * Math.PI * 2;
                    const treeDistance = Math.random() * pos.width * 0.7;
                    const treeX = pos.x + Math.cos(treeAngle) * treeDistance;
                    const treeZ = pos.z + Math.sin(treeAngle) * treeDistance;
                    const treeY = pos.height * 0.6 + Math.random() * 3;
                    
                    trunk.position.set(treeX, treeY + treeHeight * 0.2, treeZ);
                    canopy.position.set(treeX, treeY + treeHeight * 0.7, treeZ);
                    
                    trunk.userData.templateObject = true;
                    canopy.userData.templateObject = true;
                    
                    this.addTrackedObject(trunk, `forestTree_${index}_${t}_trunk`);
                    this.addTrackedObject(canopy, `forestTree_${index}_${t}_canopy`);
                    this.forestElements.push(trunk, canopy);
                }
            });
            
        } catch (error) {
            console.error('🌲 Error creating forest ring:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createDramaticCliffs = function() {
        try {
            console.log('⛰️ Creating dramatic terraced coastal cliffs...');
            
            // Create cliffs only on the land side (positive Z and sides), not ocean side
            const cliffPositions = [
                { x: -130, z: 80, width: 50, height: 45, depth: 35, rotation: 0.3 },   // Left back
                { x: 130, z: 100, width: 45, height: 42, depth: 32, rotation: -0.4 },  // Right back
                { x: 0, z: 140, width: 60, height: 50, depth: 40, rotation: 0.1 },     // Center back
                { x: -100, z: 120, width: 40, height: 38, depth: 30, rotation: 0.2 },  // Left back 2
                { x: 100, z: 130, width: 42, height: 40, depth: 28, rotation: -0.3 }   // Right back 2
            ];
            
            cliffPositions.forEach((cliff, index) => {
                // Create main cliff with terraced levels
                this.createTerracedCliff(cliff, index);
            });
            
        } catch (error) {
            console.error('⛰️ Error creating dramatic cliffs:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createTerracedCliff = function(cliff, index) {
        try {
            // Create main cliff body - tallest level
            const mainCliffGeometry = new this.THREE.BoxGeometry(cliff.width, cliff.height, cliff.depth);
            const cliffMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x696969, // Dim gray
                flatShading: true
            });
            const mainCliff = new this.THREE.Mesh(mainCliffGeometry, cliffMaterial);
            
            mainCliff.position.set(cliff.x, cliff.height / 2, cliff.z);
            mainCliff.rotation.y = cliff.rotation;
            mainCliff.userData.templateObject = true;
            this.addTrackedObject(mainCliff, `mainCliff_${index}`);
            this.cliffElements.push(mainCliff);
            
            // Create terraced levels stepping down - 3 levels on each side
            const numTerraceLevels = 3;
            const terraceStep = 15; // Distance between terraces
            
            for (let side = -1; side <= 1; side += 2) { // -1 for left, +1 for right
                for (let level = 1; level <= numTerraceLevels; level++) {
                    const terraceHeight = cliff.height * (1 - level * 0.25); // Each level 25% shorter
                    const terraceWidth = cliff.width * (1 - level * 0.15);   // Each level narrower
                    const terraceDepth = cliff.depth * (1 - level * 0.1);    // Each level shallower
                    
                    const terraceGeometry = new this.THREE.BoxGeometry(terraceWidth, terraceHeight, terraceDepth);
                    const terrace = new this.THREE.Mesh(terraceGeometry, cliffMaterial);
                    
                    // Position terraces stepping away from main cliff
                    const stepOutDistance = terraceStep * level;
                    const terraceX = cliff.x + side * stepOutDistance * Math.cos(cliff.rotation);
                    const terraceZ = cliff.z + side * stepOutDistance * Math.sin(cliff.rotation);
                    
                    terrace.position.set(terraceX, terraceHeight / 2, terraceZ);
                    terrace.rotation.y = cliff.rotation;
                    terrace.userData.templateObject = true;
                    
                    this.addTrackedObject(terrace, `terrace_${index}_${side}_${level}`);
                    this.cliffElements.push(terrace);
                    
                    // Add rocky details to each terrace
                    for (let r = 0; r < 2; r++) { // Reduced from 3 to 2
                        const rockSize = 1.5 + Math.random() * 2;
                        const rockGeometry = new this.THREE.BoxGeometry(rockSize, rockSize * 0.8, rockSize * 0.6); // Simplified from DodecahedronGeometry
                        const rockMaterial = new this.THREE.MeshLambertMaterial({ 
                            color: 0x778899 // Light slate gray
                        });
                        const rock = new this.THREE.Mesh(rockGeometry, rockMaterial);
                        
                        rock.position.set(
                            terraceX + (Math.random() - 0.5) * terraceWidth * 0.8,
                            terraceHeight * 0.6 + Math.random() * 3,
                            terraceZ + (Math.random() - 0.5) * terraceDepth * 0.8
                        );
                        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                        rock.userData.templateObject = true;
                        
                        this.addTrackedObject(rock, `terraceRock_${index}_${side}_${level}_${r}`);
                        this.cliffElements.push(rock);
                    }
                }
            }
            
            // Add cliff top vegetation - trees and bushes on main cliff
            const vegetationCount = 5 + Math.random() * 2; // Reduced from 8 + random 4
            for (let v = 0; v < vegetationCount; v++) {
                if (Math.random() > 0.5) {
                    // Create trees on cliff top
                    const treeHeight = 12 + Math.random() * 8;
                    const trunkGeometry = new this.THREE.CylinderGeometry(0.8, 1.2, treeHeight * 0.4);
                    const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
                    
                    const canopyGeometry = new this.THREE.SphereGeometry(3 + Math.random() * 2, 8, 6);
                    const canopyMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
                    const canopy = new this.THREE.Mesh(canopyGeometry, canopyMaterial);
                    
                    const treeX = cliff.x + (Math.random() - 0.5) * cliff.width * 0.8;
                    const treeY = cliff.height + treeHeight * 0.2;
                    const treeZ = cliff.z + (Math.random() - 0.5) * cliff.depth * 0.8;
                    
                    trunk.position.set(treeX, treeY, treeZ);
                    canopy.position.set(treeX, treeY + treeHeight * 0.6, treeZ);
                    
                    trunk.userData.templateObject = true;
                    canopy.userData.templateObject = true;
                    
                    this.addTrackedObject(trunk, `cliffTree_${index}_${v}_trunk`);
                    this.addTrackedObject(canopy, `cliffTree_${index}_${v}_canopy`);
                    this.cliffElements.push(trunk, canopy);
                } else {
                    // Create bushes on cliff top
                    const bushGeometry = new this.THREE.SphereGeometry(2 + Math.random() * 1.5, 8, 6);
                    const bushMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: 0x228B22 // Forest green
                    });
                    const bush = new this.THREE.Mesh(bushGeometry, bushMaterial);
                    
                    bush.position.set(
                        cliff.x + (Math.random() - 0.5) * cliff.width * 0.9,
                        cliff.height + 1 + Math.random() * 2,
                        cliff.z + (Math.random() - 0.5) * cliff.depth * 0.9
                    );
                    bush.userData.templateObject = true;
                    
                    this.addTrackedObject(bush, `cliffBush_${index}_${v}`);
                    this.cliffElements.push(bush);
                }
            }
            
            // Add hanging vines on cliff face
            for (let vine = 0; vine < 3; vine++) { // Reduced from 5 to 3
                const vineGeometry = new this.THREE.CylinderGeometry(0.1, 0.2, 8 + Math.random() * 6, 6); // Reduced segments
                const vineMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x556B2F // Dark olive green
                });
                const vineObj = new this.THREE.Mesh(vineGeometry, vineMaterial);
                
                // Position vines hanging from cliff edge
                const vineAngle = Math.random() * Math.PI * 2;
                const vineDistance = cliff.width * 0.4;
                vineObj.position.set(
                    cliff.x + Math.cos(vineAngle) * vineDistance,
                    cliff.height * 0.7,
                    cliff.z + Math.sin(vineAngle) * vineDistance
                );
                vineObj.rotation.x = (Math.random() - 0.5) * 0.3; // Slight sway
                vineObj.userData.templateObject = true;
                vineObj.userData.isSwaying = true;
                vineObj.userData.swayPhase = Math.random() * Math.PI * 2;
                
                this.addTrackedObject(vineObj, `cliffVine_${index}_${vine}`);
                this.cliffElements.push(vineObj);
            }
            
        } catch (error) {
            console.error('⛰️ Error creating terraced cliff:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createPalmTreeGroves = function() {
        try {
            console.log('🌴 Creating palm tree groves along the beach...');
            
            // Create palm groves positioned between the beach and forest crescent
            // Focus more on the sides and back, leaving ocean approach clear
            const grovePositions = [
                { x: -45, z: 35, count: 5, spread: 15 },   // Left side
                { x: 40, z: 30, count: 4, spread: 12 },    // Right side  
                { x: -35, z: 50, count: 6, spread: 18 },   // Left back
                { x: 50, z: 45, count: 4, spread: 14 },    // Right back
                { x: -55, z: 10, count: 5, spread: 16 },   // Left
                { x: 55, z: 15, count: 4, spread: 14 },    // Right
                { x: -20, z: 60, count: 3, spread: 10 },   // Left back edge
                { x: 25, z: 65, count: 3, spread: 12 }     // Right back edge
            ];
            
            grovePositions.forEach((grove, groveIndex) => {
                for (let p = 0; p < grove.count; p++) {
                    const palmX = grove.x + (Math.random() - 0.5) * grove.spread;
                    const palmZ = grove.z + (Math.random() - 0.5) * grove.spread;
                    
                    this.createDetailedPalmTree(palmX, palmZ, groveIndex, p);
                }
            });
            
        } catch (error) {
            console.error('🌴 Error creating palm groves:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createDetailedPalmTree = function(x, z, groveIndex, treeIndex) {
        try {
            const palmHeight = 18 + Math.random() * 8;
            const palmLean = (Math.random() - 0.5) * 0.3; // Natural lean
            
            // Palm trunk with segments for realism
            const segments = 4; // Reduced from 6 to 4
            const segmentHeight = palmHeight / segments;
            
            for (let s = 0; s < segments; s++) {
                const segmentRadius = 1.2 - (s * 0.1); // Tapers toward top
                const trunkGeometry = new this.THREE.CylinderGeometry(
                    segmentRadius * 0.8, segmentRadius, segmentHeight, 6 // Reduced from 8 to 6 segments
                );
                const trunkMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x8B4513 // Saddle brown
                });
                const segment = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
                
                segment.position.set(
                    x + palmLean * s * 0.5,
                    segmentHeight * (s + 0.5),
                    z
                );
                segment.userData.templateObject = true;
                
                this.addTrackedObject(segment, `palm_${groveIndex}_${treeIndex}_segment_${s}`);
                this.palmTrees.push(segment);
            }
            
            // Palm fronds - 6 large fronds in crown (reduced from 8)
            for (let f = 0; f < 6; f++) {
                const frondAngle = (f / 6) * Math.PI * 2;
                const frondLength = 8 + Math.random() * 4;
                
                // Frond stem
                const stemGeometry = new this.THREE.CylinderGeometry(0.2, 0.3, frondLength, 6); // Reduced segments
                const stemMaterial = new this.THREE.MeshLambertMaterial({ color: 0x228B22 });
                const stem = new this.THREE.Mesh(stemGeometry, stemMaterial);
                
                // Frond leaves - simplified geometry
                const leafGeometry = new this.THREE.PlaneGeometry(frondLength * 0.8, 2);
                const leafMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22,
                    side: this.THREE.DoubleSide
                });
                const leaf = new this.THREE.Mesh(leafGeometry, leafMaterial);
                
                const frondX = x + palmLean * segments * 0.5;
                const frondY = palmHeight;
                const frondZ = z;
                
                // Position and rotate fronds naturally
                stem.position.set(frondX, frondY, frondZ);
                stem.rotation.z = Math.cos(frondAngle) * 0.6;
                stem.rotation.x = Math.sin(frondAngle) * 0.6;
                stem.rotation.y = frondAngle;
                
                leaf.position.copy(stem.position);
                leaf.position.y += frondLength * 0.3;
                leaf.rotation.copy(stem.rotation);
                leaf.rotation.z += (Math.random() - 0.5) * 0.3;
                
                stem.userData.templateObject = true;
                leaf.userData.templateObject = true;
                stem.userData.isSwaying = true;
                leaf.userData.isSwaying = true;
                stem.userData.swayPhase = Math.random() * Math.PI * 2;
                leaf.userData.swayPhase = stem.userData.swayPhase;
                
                this.addTrackedObject(stem, `palm_${groveIndex}_${treeIndex}_frond_${f}_stem`);
                this.addTrackedObject(leaf, `palm_${groveIndex}_${treeIndex}_frond_${f}_leaf`);
                this.palmTrees.push(stem, leaf);
            }
            
            // Coconuts hanging from some palms
            if (Math.random() > 0.4) {
                for (let c = 0; c < 2; c++) { // Reduced from 3 to 2 coconuts
                    const coconutGeometry = new this.THREE.SphereGeometry(0.8, 6, 4); // Reduced from 8,6 to 6,4
                    const coconutMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                    const coconut = new this.THREE.Mesh(coconutGeometry, coconutMaterial);
                    
                    const coconutAngle = Math.random() * Math.PI * 2;
                    coconut.position.set(
                        x + palmLean * segments * 0.5 + Math.cos(coconutAngle) * 2,
                        palmHeight - 2 - Math.random() * 3,
                        z + Math.sin(coconutAngle) * 2
                    );
                    coconut.userData.templateObject = true;
                    
                    this.addTrackedObject(coconut, `coconut_${groveIndex}_${treeIndex}_${c}`);
                    this.palmTrees.push(coconut);
                }
            }
            
        } catch (error) {
            console.error('🌴 Error creating detailed palm tree:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createTropicalSky = function() {
        try {
            console.log('🌅 Creating dramatic tropical sunset sky...');
            
            // Create sky gradient with tropical sunset colors
            const skyGeometry = new this.THREE.SphereGeometry(500, 32, 15);
            const skyMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    topColor: { value: new this.THREE.Color(0xFF6B35) },    // Sunset orange
                    middleColor: { value: new this.THREE.Color(0xFF8E53) }, // Light orange
                    bottomColor: { value: new this.THREE.Color(0x87CEEB) }, // Sky blue
                    offset: { value: 33 },
                    exponent: { value: 0.6 }
                },
                vertexShader: `
                    varying vec3 vWorldPosition;
                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPosition.xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 topColor;
                    uniform vec3 middleColor;
                    uniform vec3 bottomColor;
                    uniform float offset;
                    uniform float exponent;
                    varying vec3 vWorldPosition;
                    void main() {
                        float h = normalize(vWorldPosition).y;
                        float ramp = max(offset, pow(max(h, 0.0), exponent));
                        
                        // Three-color gradient for tropical sunset
                        vec3 color;
                        if (h > 0.3) {
                            color = mix(middleColor, topColor, (h - 0.3) / 0.7);
                        } else {
                            color = mix(bottomColor, middleColor, h / 0.3);
                        }
                        
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
                side: this.THREE.BackSide
            });
            
            const skyDome = new this.THREE.Mesh(skyGeometry, skyMaterial);
            skyDome.position.y = 0;
            skyDome.userData.templateObject = true;
            this.addTrackedObject(skyDome, 'tropicalSky');
            
        } catch (error) {
            console.error('🌅 Error creating tropical sky:', error);
        }
    };

    TropicalParadiseWorldTemplate.prototype.createTropicalBirds = function() {
        try {
            console.log('🦅 Creating tropical birds...');
            
            // Create a few flying birds for ambiance
            for (let b = 0; b < 4; b++) {
                const birdGeometry = new this.THREE.SphereGeometry(0.8, 6, 4);
                const birdMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x8B0000 // Dark red - tropical bird
                });
                const bird = new this.THREE.Mesh(birdGeometry, birdMaterial);
                
                bird.position.set(
                    (Math.random() - 0.5) * 200,
                    30 + Math.random() * 20,
                    (Math.random() - 0.5) * 200
                );
                bird.userData.templateObject = true;
                bird.userData.isFlying = true;
                bird.userData.flySpeed = 0.5 + Math.random() * 0.5;
                bird.userData.flyRadius = 50 + Math.random() * 30;
                bird.userData.flyAngle = Math.random() * Math.PI * 2;
                
                this.addTrackedObject(bird, `tropicalBird_${b}`);
                this.decorativeElements.push(bird);
            }
            
        } catch (error) {
            console.error('🦅 Error creating tropical birds:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createPalmTrees = function() {
        try {
            console.log('🌴 Creating tropical palm trees...');
            
            // Initialize palmTrees array if not exists
            if (!this.palmTrees) this.palmTrees = [];
            
            const palmPositions = [
                { x: -60, z: 40 }, { x: 60, z: 40 }, { x: -40, z: -20 }, 
                { x: 40, z: -20 }, { x: -80, z: 0 }, { x: 80, z: 0 },
                { x: -30, z: 60 }, { x: 30, z: 60 }
            ];
            
            palmPositions.forEach((pos, index) => {
                this.createPalmTree(pos.x, pos.z);
            });
            
            console.log(`🌴 Created ${palmPositions.length} palm trees`);
            
        } catch (error) {
            console.error('🌴 Error creating palm trees:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createPalmTree = function(x, z) {
        try {
            // Create palm trunk with natural curve
            const trunkGeometry = new this.THREE.CylinderGeometry(0.8, 1.2, 20, 8);
            const trunkMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Saddle brown
            
            const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, 10, z);
            trunk.rotation.z = (Math.random() - 0.5) * 0.3; // Slight natural lean
            trunk.userData.templateObject = true;
            
            this.palmTrees.push(trunk);
            this.addTrackedObject(trunk, `palmTrunk_${this.palmTrees.length}`);
            
            // Create coconuts
            for (let c = 0; c < 3; c++) {
                const coconutGeometry = new this.THREE.SphereGeometry(0.8, 8, 6);
                const coconutMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const coconut = new this.THREE.Mesh(coconutGeometry, coconutMaterial);
                coconut.position.set(
                    x + (Math.random() - 0.5) * 3, 
                    18 + Math.random() * 2, 
                    z + (Math.random() - 0.5) * 3
                );
                coconut.userData.templateObject = true;
                
                this.addTrackedObject(coconut, `coconut_${this.palmTrees.length}_${c}`);
            }
            
            // Create palm fronds
            for (let i = 0; i < 12; i++) {
                const frondGeometry = new this.THREE.PlaneGeometry(15, 4);
                const frondMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x228B22,  // Forest green
                    side: this.THREE.DoubleSide
                });
                
                const frond = new this.THREE.Mesh(frondGeometry, frondMaterial);
                frond.position.set(x, 19, z);
                frond.rotation.y = (i / 12) * Math.PI * 2;
                frond.rotation.x = -0.4 + Math.random() * 0.2; // Natural droop with variation
                frond.userData.templateObject = true;
                frond.userData.isSwaying = true;
                frond.userData.swayPhase = Math.random() * Math.PI * 2;
                
                this.addTrackedObject(frond, `palmFrond_${this.palmTrees.length}_${i}`);
            }
            
        } catch (error) {
            console.error('🌴 Error creating palm tree:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createAnimatedWater = function() {
        try {
            console.log('🌊 Creating animated tropical water with shader effects...');
            
            // Create animated water with sophisticated shader
            const waterGeometry = new this.THREE.PlaneGeometry(200, 200, 50, 50);
            
            const waterMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    waterColor: { value: new this.THREE.Color(0x0099CC) },
                    foamColor: { value: new this.THREE.Color(0xFFFFFF) }
                },
                vertexShader: `
                    uniform float time;
                    varying vec2 vUv;
                    varying float vElevation;
                    
                    void main() {
                        vUv = uv;
                        
                        vec3 pos = position;
                        
                        // Create ripple effect with multiple waves
                        float wave1 = sin(pos.x * 0.5 + time * 2.0) * 0.3;
                        float wave2 = sin(pos.y * 0.3 + time * 1.5) * 0.2;
                        float wave3 = sin((pos.x + pos.y) * 0.4 + time * 1.0) * 0.15;
                        
                        pos.z += wave1 + wave2 + wave3;
                        vElevation = wave1 + wave2 + wave3;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 waterColor;
                    uniform vec3 foamColor;
                    varying vec2 vUv;
                    varying float vElevation;
                    
                    void main() {
                        // Mix water color with foam on wave peaks
                        float foamMix = smoothstep(0.2, 0.5, vElevation);
                        vec3 color = mix(waterColor, foamColor, foamMix * 0.3);
                        
                        gl_FragColor = vec4(color, 0.7);
                    }
                `,
                transparent: true,
                side: this.THREE.DoubleSide
            });
            
            this.waterPlane = new this.THREE.Mesh(waterGeometry, waterMaterial);
            this.waterPlane.rotation.x = -Math.PI / 2;
            this.waterPlane.position.y = 0.1; // Slightly above ground
            this.waterPlane.userData.templateObject = true;
            this.waterPlane.userData.isAnimated = true;
            this.waterPlane.userData.waterMaterial = waterMaterial;
            
            this.addTrackedObject(this.waterPlane, 'tropicalWater');
            
        } catch (error) {
            console.error('🌊 Error creating animated water:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createRockyCliffs = function() {
        try {
            console.log('🏔️ Creating rocky tropical cliffs...');
            
            const cliffPositions = [
                { x: -80, z: -80, width: 30, height: 15, depth: 20 },
                { x: 80, z: 70, width: 25, height: 20, depth: 25 },
                { x: -70, z: 80, width: 35, height: 18, depth: 20 },
                { x: 85, z: -60, width: 28, height: 16, depth: 22 }
            ];
            
            cliffPositions.forEach((pos, index) => {
                const cliffGeometry = new this.THREE.BoxGeometry(pos.width, pos.height, pos.depth);
                const cliffMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x696969, // Dim gray
                    flatShading: true
                });
                const cliff = new this.THREE.Mesh(cliffGeometry, cliffMaterial);
                
                cliff.position.set(pos.x, pos.height / 2, pos.z);
                cliff.rotation.y = Math.random() * Math.PI / 4; // Slight random rotation
                cliff.userData.templateObject = true;
                cliff.userData.isCliff = true;
                
                this.addTrackedObject(cliff, `cliff_${index}`);
                
                // Add some smaller rocky outcroppings for detail
                for (let r = 0; r < 2; r++) {
                    const rockGeometry = new this.THREE.DodecahedronGeometry(1.5 + Math.random() * 1, 0);
                    const rockMaterial = new this.THREE.MeshLambertMaterial({ color: 0x778899 });
                    const rock = new this.THREE.Mesh(rockGeometry, rockMaterial);
                    rock.position.set(
                        pos.x + (Math.random() - 0.5) * pos.width * 1.2,
                        Math.random() * 3,
                        pos.z + (Math.random() - 0.5) * pos.depth * 1.2
                    );
                    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    rock.userData.templateObject = true;
                    
                    this.addTrackedObject(rock, `cliffRock_${index}_${r}`);
                }
            });
            
        } catch (error) {
            console.error('🏔️ Error creating rocky cliffs:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createLushHills = function() {
        try {
            console.log('🌿 Creating lush tropical hills...');
            
            const hillPositions = [
                { x: 60, z: 50, radius: 25, height: 12 },
                { x: -65, z: 40, radius: 20, height: 10 },
                { x: 50, z: -70, radius: 22, height: 11 },
                { x: -50, z: -60, radius: 18, height: 9 }
            ];
            
            hillPositions.forEach((pos, index) => {
                // Create rounded hill with proper hemisphere geometry
                const hillGeometry = new this.THREE.SphereGeometry(pos.radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const hillMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: 0x4A9F4A // Medium green - more natural color
                });
                const hill = new this.THREE.Mesh(hillGeometry, hillMaterial);
                
                hill.position.set(pos.x, 0, pos.z);
                hill.scale.y = pos.height / pos.radius; // Flatten to create natural hill shape
                hill.userData.templateObject = true;
                hill.userData.isHill = true;
                
                this.addTrackedObject(hill, `hill_${index}`);
                
                // Add some vegetation on hills
                for (let v = 0; v < 5; v++) {
                    const bushGeometry = new this.THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 6);
                    const bushMaterial = new this.THREE.MeshLambertMaterial({ 
                        color: 0x228B22 // Darker green for contrast
                    });
                    const bush = new this.THREE.Mesh(bushGeometry, bushMaterial);
                    
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * pos.radius * 0.8;
                    bush.position.set(
                        pos.x + Math.cos(angle) * distance,
                        pos.height * 0.7 + Math.random() * 2,
                        pos.z + Math.sin(angle) * distance
                    );
                    bush.userData.templateObject = true;
                    
                    this.addTrackedObject(bush, `hillBush_${index}_${v}`);
                }
            });
            
        } catch (error) {
            console.error('🌿 Error creating lush hills:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createSun = function() {
        try {
            console.log('☀️ Creating tropical sun...');
            
            const sunGeometry = new this.THREE.SphereGeometry(8, 32, 16);
            const sunMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0xFFD700,  // Gold
                emissive: 0xFFD700,
                emissiveIntensity: 0.3
            });
            
            const sun = new this.THREE.Mesh(sunGeometry, sunMaterial);
            sun.position.set(100, 80, -100);
            sun.userData.templateObject = true;
            sun.userData.isGlowing = true;
            
            this.addTrackedObject(sun, 'tropicalSun');
            
        } catch (error) {
            console.error('☀️ Error creating sun:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createBeachDecorations = function() {
        try {
            console.log('🏖️ Creating coastal beach decorations...');
            
            // Seashells scattered along the shoreline
            const shellPositions = [
                { x: -20, z: -10 }, { x: 25, z: -15 }, { x: -15, z: -20 }, 
                { x: 30, z: -8 }, { x: -10, z: -25 }, { x: 18, z: -12 },
                { x: 5, z: -18 }, { x: -30, z: -5 }, { x: 35, z: -22 }
            ];
            
            shellPositions.forEach((pos, index) => {
                const shellGeometry = new this.THREE.ConeGeometry(0.5, 1, 8);
                const shellMaterial = new this.THREE.MeshLambertMaterial({ 
                    color: [0xFFF8DC, 0xF5DEB3, 0xDDA0DD, 0xFFB6C1][Math.floor(Math.random() * 4)]
                });
                const shell = new this.THREE.Mesh(shellGeometry, shellMaterial);
                shell.position.set(pos.x, 0.3, pos.z);
                shell.rotation.z = Math.random() * Math.PI * 2;
                shell.userData.templateObject = true;
                
                this.addTrackedObject(shell, `seashell_${index}`);
                this.decorativeElements.push(shell);
            });
            
            // Driftwood along the beach
            for (let d = 0; d < 6; d++) {
                const driftwoodGeometry = new this.THREE.CylinderGeometry(0.5, 0.8, 4 + Math.random() * 3);
                const driftwoodMaterial = new this.THREE.MeshLambertMaterial({ color: 0x8B7355 }); // Burlywood
                const driftwood = new this.THREE.Mesh(driftwoodGeometry, driftwoodMaterial);
                
                const angle = Math.random() * Math.PI;
                const distance = 35 + Math.random() * 15;
                driftwood.position.set(
                    Math.cos(angle) * distance * (Math.random() > 0.5 ? 1 : -1),
                    0.5,
                    -10 - Math.random() * 15
                );
                driftwood.rotation.y = Math.random() * Math.PI * 2;
                driftwood.rotation.z = (Math.random() - 0.5) * 0.5;
                driftwood.userData.templateObject = true;
                
                this.addTrackedObject(driftwood, `driftwood_${d}`);
                this.decorativeElements.push(driftwood);
            }
            
            // Beach grasses near the forest edge
            const grassPositions = [
                { x: -60, z: 45 }, { x: 60, z: 45 }, { x: -45, z: 55 }, 
                { x: 45, z: 55 }, { x: -70, z: 25 }, { x: 70, z: 25 }
            ];
            
            grassPositions.forEach((pos, index) => {
                // Create clumps of beach grass
                for (let g = 0; g < 8; g++) {
                    const grassGeometry = new this.THREE.CylinderGeometry(0.1, 0.2, 2 + Math.random() * 2);
                    const grassMaterial = new this.THREE.MeshLambertMaterial({ color: 0x9ACD32 }); // Yellow green
                    const grass = new this.THREE.Mesh(grassGeometry, grassMaterial);
                    
                    grass.position.set(
                        pos.x + (Math.random() - 0.5) * 8,
                        1 + Math.random(),
                        pos.z + (Math.random() - 0.5) * 8
                    );
                    grass.rotation.x = (Math.random() - 0.5) * 0.3;
                    grass.rotation.z = (Math.random() - 0.5) * 0.3;
                    grass.userData.templateObject = true;
                    grass.userData.isSwaying = true;
                    grass.userData.swayPhase = Math.random() * Math.PI * 2;
                    
                    this.addTrackedObject(grass, `beachGrass_${index}_${g}`);
                    this.decorativeElements.push(grass);
                }
            });
            
        } catch (error) {
            console.error('🏖️ Error creating beach decorations:', error);
        }
    };
    
    TropicalParadiseWorldTemplate.prototype.createBasicTropical = function() {
        console.log('🌴 Creating basic tropical fallback environment');
        
        try {
            // Just create a simple water area and a few basic objects
            const waterGeometry = new this.THREE.CircleGeometry(8, 16);
            const waterMaterial = new this.THREE.MeshLambertMaterial({ 
                color: 0x006994,
                transparent: true,
                opacity: 0.8
            });
            
            const water = new this.THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.set(0, 0, -30); // Behind the center
            water.userData.templateObject = true;
            
            this.addTrackedObject(water, 'basicTropicalWater');
            
        } catch (error) {
            console.error('🌴 Error creating basic tropical:', error);
        }
    };
    
    // Override positioning constraints to implement Green Plane-style behavior
    TropicalParadiseWorldTemplate.prototype.applyPositionConstraints = function(object, newPosition, allObjects = []) {
        const constraints = this.getPositioningConstraints();
        
        // Apply world boundaries first
        let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
        let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
        
        // Get object height for proper positioning - check userData first (for contact objects), then geometry parameters
        const objectHeight = object.userData?.objectHeight || object.geometry?.parameters?.height || 1;
        
        // Define ground level (same as Green Plane)
        const groundLevelY = 0;
        
        // Check if stacking is enabled and this position is intentional
        const stackingEnabled = window.app?.sortingManager?.stackingConfig?.enabled;
        const isStackedPosition = newPosition.y > (groundLevelY + objectHeight / 2 + 0.1); // More than ground level + small tolerance
        
        let constrainedY;
        if (stackingEnabled && isStackedPosition) {
            // If stacking is enabled and this seems to be a stacked position, respect the Y coordinate
            constrainedY = newPosition.y;
            console.log(`Tropical Paradise constraints for ${object.userData.fileName || 'unknown'}:`);
            console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
            console.log(`  Ground level Y: ${groundLevelY}`);
            console.log(`  Object height: ${objectHeight}`);
            console.log(`  Stacking enabled - respecting Y position: ${constrainedY}`);
        } else {
            // Normal ground positioning logic (same as Green Plane)
            constrainedY = groundLevelY + objectHeight / 2; // Position so object bottom sits on ground
            
            console.log(`Tropical Paradise constraints for ${object.userData.fileName || 'unknown'}:`);
            console.log(`  Original position: (${newPosition.x}, ${newPosition.y}, ${newPosition.z})`);
            console.log(`  Ground level Y: ${groundLevelY}`);
            console.log(`  Object height: ${objectHeight}`);
            console.log(`  Base constrained Y: ${constrainedY}`);
        }
        
        // TROPICAL PARADISE WORLD: Objects must be supported - check for objects below (same logic as Green Plane)
        if (constraints.requiresSupport && allObjects.length > 0 && !(stackingEnabled && isStackedPosition)) {
            // Only apply support logic if not using stacking system
            const otherObjects = allObjects.filter(obj => obj !== object);
            let supportObject = null;
            let maxSupportHeight = groundLevelY + objectHeight / 2; // Ground level + object center height
            
            // Find the highest object that can support this object at the constrained position
            for (const otherObj of otherObjects) {
                // Get dimensions for support object - check userData first (for contact objects), then geometry parameters
                const otherWidth = otherObj.userData?.objectWidth || otherObj.geometry?.parameters?.width || (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherDepth = otherObj.userData?.objectDepth || otherObj.geometry?.parameters?.depth || (otherObj.geometry?.parameters?.radius * 2) || 1;
                const otherHeight = otherObj.userData?.objectHeight || otherObj.geometry?.parameters?.height || 1;
                
                const otherHalfWidth = otherWidth / 2;
                const otherHalfDepth = otherDepth / 2;
                
                // Check if the object is close enough to provide support
                if (Math.abs(constrainedX - otherObj.position.x) < otherHalfWidth && 
                    Math.abs(constrainedZ - otherObj.position.z) < otherHalfDepth) {
                    // Calculate support height: top of supporting object + half height of object being placed
                    const supportHeight = otherObj.position.y + otherHeight / 2 + objectHeight / 2;
                    
                    if (supportHeight > maxSupportHeight) {
                        maxSupportHeight = supportHeight;
                        supportObject = otherObj;
                    }
                }
            }
            
            // If we found a supporting object, only adjust Y (height) but preserve intended X,Z position
            if (supportObject) {
                // DON'T snap X,Z to supporting object - preserve user's intended position
                // Only adjust Y to place on top of supporting object
                constrainedY = maxSupportHeight;
                console.log(`  Found support object: ${supportObject.userData.fileName || 'unknown'} at Y=${supportObject.position.y}`);
                console.log(`  Preserving user position (${constrainedX}, ${constrainedZ}), adjusting Y to: ${constrainedY}`);
            } else {
                // No support found, place on ground (already set above)
                constrainedY = groundLevelY + objectHeight / 2;
                console.log(`  No support found, placing on ground at Y=${constrainedY}`);
            }
        }
        
        const result = {
            x: constrainedX,
            y: constrainedY,
            z: constrainedZ
        };
        
        console.log(`  Final constrained position: (${result.x}, ${result.y}, ${result.z})`);
        return result;
    };
    
    // Animation Update
    TropicalParadiseWorldTemplate.prototype.update = function(deltaTime) {
        try {
            const time = Date.now() * 0.001;
            
            // Animate ocean waves
            if (this.oceanPlane && this.oceanPlane.userData.oceanMaterial) {
                this.oceanPlane.userData.oceanMaterial.uniforms.time.value = time;
            }
            
            // Animate palm fronds swaying and flying birds
            if (this.trackedObjects) {
                Object.keys(this.trackedObjects).forEach(key => {
                    const obj = this.trackedObjects[key];
                    
                    // Animate palm fronds and vegetation swaying in the breeze
                    if (obj.userData && obj.userData.isSwaying) {
                        const swayPhase = obj.userData.swayPhase || 0;
                        
                        // Different sway patterns for different objects
                        if (obj.geometry && obj.geometry.type === 'CylinderGeometry') {
                            // Vines and grass - more dramatic sway
                            obj.rotation.z = Math.sin(time * 1.2 + swayPhase) * 0.2;
                            obj.rotation.x = Math.cos(time * 0.9 + swayPhase) * 0.1;
                        } else {
                            // Palm fronds - gentle sway
                            obj.rotation.z = Math.sin(time * 0.8 + swayPhase) * 0.15;
                            obj.rotation.x += Math.sin(time * 0.6 + swayPhase) * 0.02;
                        }
                    }
                    
                    // Animate flying birds
                    if (obj.userData && obj.userData.isFlying) {
                        obj.userData.flyAngle += obj.userData.flySpeed * deltaTime;
                        obj.position.x = Math.cos(obj.userData.flyAngle) * obj.userData.flyRadius;
                        obj.position.z = Math.sin(obj.userData.flyAngle) * obj.userData.flyRadius;
                        obj.position.y += Math.sin(time * 2 + obj.userData.flyAngle) * 0.5; // Gentle up/down movement
                        obj.rotation.y = obj.userData.flyAngle + Math.PI / 2; // Face flight direction
                    }
                });
            }
            
            // Update animation mixers
            if (this.animationMixers && this.animationMixers.length > 0) {
                this.animationMixers.forEach(mixer => {
                    mixer.update(deltaTime);
                });
            }
            
        } catch (error) {
            console.error('�️ Error in tropical paradise update:', error);
        }
    };
    
    // Cleanup and Disposal
    TropicalParadiseWorldTemplate.prototype.cleanupEnvironment = function() {
        console.log('🌴 Cleaning up Tropical Paradise environment...');
        
        // Clean up tracked objects
        this.trackedObjects.forEach(obj => {
            if (obj && this.scene && obj.parent === this.scene) {
                this.scene.remove(obj);
                
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
        });
        
        this.palmTrees = [];
        this.tropicalElements = [];
        this.animationMixers = [];
        this.trackedObjects.clear();
        
        console.log('🌴 Tropical Paradise cleanup complete');
    };

    TropicalParadiseWorldTemplate.prototype.dispose = function() {
        try {
            console.log('🌴 Disposing tropical paradise resources...');
            
            // Clear tropical-specific arrays
            this.palmTrees = [];
            this.tropicalElements = [];
            
            // Dispose animation mixers
            if (this.animationMixers) {
                this.animationMixers.forEach(mixer => {
                    if (mixer.dispose) mixer.dispose();
                });
                this.animationMixers = [];
            }
            
            this.waterPlane = null;
            
            // Call parent dispose if available
            if (this.cleanupEnvironment) {
                this.cleanupEnvironment();
            }
            
        } catch (error) {
            console.error('🌴 Error disposing tropical paradise:', error);
        }
    };
    
    // Add static getConfig method for registry helper
    TropicalParadiseWorldTemplate.getConfig = function() {
        return TropicalParadiseConfig;
    };
    
    // Override getType to ensure proper identification
    TropicalParadiseWorldTemplate.prototype.getType = function() {
        return 'tropical-paradise';
    };

    TropicalParadiseWorldTemplate.prototype.getDisplayName = function() {
        return 'Tropical Paradise';
    };
    
    // Make available globally
    window.TropicalParadiseWorldTemplate = TropicalParadiseWorldTemplate;
    
    // Auto-register with the helper system and new auto-integration
    if (window.worldTemplateRegistryHelper) {
        // Enhanced registration with auto-integration configuration
        const autoIntegrateConfig = {
            fileZones: {
                inherits: 'green-plane',
                type: 'ground-level'
            },
            autoIntegrate: {
                mainApplication: true,
                worldManagement: true,
                sortingManager: true,
                flutterMenu: true
            },
            menu: {
                icon: 'landscape',
                priority: 95, // Higher priority for premium worlds
                visible: true
            }
        };
        
        window.worldTemplateRegistryHelper.registerNewTemplate(TropicalParadiseWorldTemplate, autoIntegrateConfig);
        console.log('🌴 Tropical Paradise registered with enhanced auto-integration');
    } else {
        console.warn('🌴 WorldTemplateRegistryHelper not available - registration deferred');
        
        // Fallback: Try to register when helper becomes available
        const registerWhenReady = () => {
            if (window.worldTemplateRegistryHelper) {
                window.worldTemplateRegistryHelper.registerNewTemplate(TropicalParadiseWorldTemplate);
                console.log('🌴 Tropical Paradise registered (deferred)');
            } else {
                setTimeout(registerWhenReady, 100);
            }
        };
        setTimeout(registerWhenReady, 100);
    }
    
    console.log('🌴 Tropical Paradise World Template loaded successfully!');

})();