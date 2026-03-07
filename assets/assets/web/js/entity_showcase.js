/**
 * ENTITY SHOWCASE - Interactive Design Laboratory
 * Displays Level 2 and 3 entities with various complexity options
 */

class EntityShowcase {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        this.currentEntities = [];
        this.currentComplexity = 'simple';
        this.rotationSpeed = 1;
        this.animationEnabled = true;
        this.selectedEntity = 'all';
        
        this.init();
        this.setupControls();
        this.createStage();
        this.displayEntities();
        this.animate();
    }

    init() {
        // Check if required dependencies are available
        if (typeof THREE === 'undefined') {
            console.error('THREE.js not loaded!');
            return;
        }

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 20);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Controls - check if OrbitControls is available
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
        } else {
            console.warn('OrbitControls not available, using basic camera');
        }

        // Lighting
        this.setupLighting('default');

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log('✅ Entity Showcase initialized successfully');
    }

    setupLighting(mode = 'default') {
        // Clear existing lights
        const lights = this.scene.children.filter(child => child.isLight);
        lights.forEach(light => this.scene.remove(light));

        switch (mode) {
            case 'dramatic':
                // Strong directional light with dramatic shadows
                const dramaticLight = new THREE.DirectionalLight(0xffffff, 1.5);
                dramaticLight.position.set(10, 20, 5);
                dramaticLight.castShadow = true;
                this.scene.add(dramaticLight);

                const dramaticRim = new THREE.DirectionalLight(0x4169e1, 0.5);
                dramaticRim.position.set(-10, 5, -5);
                this.scene.add(dramaticRim);
                break;

            case 'soft':
                // Ambient and soft directional
                const softAmbient = new THREE.AmbientLight(0x404040, 0.8);
                this.scene.add(softAmbient);

                const softDirectional = new THREE.DirectionalLight(0xffffff, 0.8);
                softDirectional.position.set(5, 10, 5);
                softDirectional.castShadow = true;
                this.scene.add(softDirectional);
                break;

            case 'colorful':
                // Multiple colored lights
                const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7];
                colors.forEach((color, i) => {
                    const angle = (i / colors.length) * Math.PI * 2;
                    const light = new THREE.PointLight(color, 0.6, 50);
                    light.position.set(
                        Math.cos(angle) * 15,
                        8 + Math.sin(i) * 3,
                        Math.sin(angle) * 15
                    );
                    this.scene.add(light);
                });

                const colorfulAmbient = new THREE.AmbientLight(0x404040, 0.3);
                this.scene.add(colorfulAmbient);
                break;

            default:
                // Default lighting
                const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
                this.scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                directionalLight.position.set(10, 20, 5);
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 2048;
                directionalLight.shadow.mapSize.height = 2048;
                this.scene.add(directionalLight);

                const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
                fillLight.position.set(-5, 5, -5);
                this.scene.add(fillLight);
                break;
        }
    }

    createStage() {
        // Stage platform
        const stageGeometry = new THREE.CylinderGeometry(25, 25, 1, 32);
        const stageMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2c3e50,
            transparent: true,
            opacity: 0.8
        });
        const stage = new THREE.Mesh(stageGeometry, stageMaterial);
        stage.position.y = -0.5;
        stage.receiveShadow = true;
        this.scene.add(stage);

        // Stage rim
        const rimGeometry = new THREE.TorusGeometry(25, 0.5, 8, 32);
        const rimMaterial = new THREE.MeshLambertMaterial({ color: 0x34495e });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.position.y = 0;
        rim.rotation.x = Math.PI / 2;
        this.scene.add(rim);

        // Grid lines for scale reference
        const gridHelper = new THREE.PolarGridHelper(25, 8, 8, 64, 0x666666, 0x444444);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
    }

    setupControls() {
        const entitySelect = document.getElementById('entitySelect');
        const complexitySelect = document.getElementById('complexitySelect');
        const rotationSpeed = document.getElementById('rotationSpeed');
        const lightingMode = document.getElementById('lightingMode');

        entitySelect.addEventListener('change', (e) => {
            this.selectedEntity = e.target.value;
            this.displayEntities();
            this.updateEntityInfo();
        });

        complexitySelect.addEventListener('change', (e) => {
            this.currentComplexity = e.target.value;
            this.displayEntities();
            this.updateEntityInfo();
        });

        rotationSpeed.addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
        });

        lightingMode.addEventListener('change', (e) => {
            this.setupLighting(e.target.value);
        });
    }

    clearEntities() {
        this.currentEntities.forEach(entity => {
            if (entity.group && entity.group.parent) {
                entity.group.parent.remove(entity.group);
            }
            if (entity.dispose) {
                entity.dispose();
            }
        });
        this.currentEntities = [];
    }

    displayEntities() {
        this.clearEntities();

        if (this.selectedEntity === 'all') {
            this.displayAllEntities();
        } else {
            this.displaySingleEntity(this.selectedEntity);
        }
    }

    displayAllEntities() {
        const entityTypes = [
            // Level 2
            { type: 'rabbit', class: 'RabbitEntity', level: 2 },
            { type: 'squirrel', class: 'SquirrelEntity', level: 2 },
            { type: 'owl', class: 'OwlEntity', level: 2 },
            { type: 'deer', class: 'DeerEntity', level: 2 },
            { type: 'fox', class: 'FoxEntity', level: 2 },
            // Level 3
            { type: 'dragon', class: 'DragonEntity', level: 3 },
            { type: 'phoenix', class: 'PhoenixEntity', level: 3 },
            { type: 'unicorn', class: 'UnicornEntity', level: 3 },
            { type: 'griffin', class: 'GriffinEntity', level: 3 },
            { type: 'pegasus', class: 'PegasusEntity', level: 3 }
        ];

        console.log('Creating entities...');
        const radius = 15;
        entityTypes.forEach((entityData, index) => {
            console.log(`Creating ${entityData.type} with direct creation...`);
            
            // Always use our direct creation functions instead of trying entity classes
            this.createPlaceholderEntity(entityData.type, index, radius);
        });
    }

    displaySingleEntity(entityType) {
        console.log(`Creating single entity: ${entityType} with direct creation`);
        
        // Always use our direct creation functions
        this.createPlaceholderEntity(entityType, 0, 0);
    }

    createPlaceholderEntity(entityType, index, radius) {
        // Use our direct creation functions instead of placeholders
        let entity = null;
        
        switch (entityType) {
            case 'dragon':
                entity = this.createDragonDirect();
                break;
            case 'griffin':
                entity = this.createGriffinDirect();
                break;
            case 'squirrel':
                entity = this.createSquirrelDirect();
                break;
            case 'fox':
                entity = this.createFoxDirect();
                break;
            case 'rabbit':
                entity = this.createRabbitDirect();
                break;
            case 'owl':
                entity = this.createOwlDirect();
                break;
            case 'deer':
                entity = this.createDeerDirect();
                break;
            case 'phoenix':
                entity = this.createPhoenixDirect();
                break;
            case 'unicorn':
                entity = this.createUnicornDirect();
                break;
            case 'pegasus':
                entity = this.createPegasusDirect();
                break;
            default:
                // Fallback to simple cube
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshLambertMaterial({ 
                    color: Math.random() * 0xffffff 
                });
                entity = new THREE.Mesh(geometry, material);
        }
        
        if (entity) {
            if (radius > 0) {
                const angle = (index / 10) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                entity.position.set(x, 3, z);
            } else {
                entity.position.set(0, 3, 0);
                entity.scale.set(2, 2, 2);
            }
            
            entity.castShadow = true;
            entity.receiveShadow = true;
            
            // Enable shadows for all children if it's a group
            entity.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.scene.add(entity);
            
            // Create a fake entity object to match expected structure
            const fakeEntity = {
                group: entity,
                showcaseIndex: index,
                type: entityType
            };
            this.currentEntities.push(fakeEntity);
        }
        
        console.log(`✨ Created improved entity for ${entityType}`);
    }

    // ============================================================================
    // DIRECT ENTITY CREATION FUNCTIONS (V4 - High Quality Animal Designs)
    // ============================================================================

    // Shared materials for consistency
    createSharedMaterialsV4() {
        return {
            // Naturals
            brown: new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // SaddleBrown
            darkBrown: new THREE.MeshLambertMaterial({ color: 0x5C4033 }), // Dark Brown
            tan: new THREE.MeshLambertMaterial({ color: 0xD2B48C }), // Tan
            white: new THREE.MeshLambertMaterial({ color: 0xFFFFFF }),
            black: new THREE.MeshLambertMaterial({ color: 0x111111 }),
            gray: new THREE.MeshLambertMaterial({ color: 0x808080 }),

            // Fox
            foxOrange: new THREE.MeshLambertMaterial({ color: 0xD95F30 }),
            foxCream: new THREE.MeshLambertMaterial({ color: 0xF5DEB3 }),

            // Mythical
            dragonScale: new THREE.MeshLambertMaterial({ color: 0x4B0082 }), // Indigo
            dragonWing: new THREE.MeshLambertMaterial({ color: 0x6A5ACD, transparent: true, opacity: 0.8 }), // SlateBlue
            phoenixRed: new THREE.MeshLambertMaterial({ color: 0xE34234 }),
            phoenixOrange: new THREE.MeshLambertMaterial({ color: 0xFF8C00 }),
            phoenixYellow: new THREE.MeshLambertMaterial({ color: 0xFFD700 }),
            gold: new THREE.MeshLambertMaterial({ color: 0xFFD700, shininess: 100 }),
            unicornWhite: new THREE.MeshLambertMaterial({ color: 0xF8F8FF }),
            rainbow: new THREE.MeshLambertMaterial({ vertexColors: true }),
        };
    }

    createEyeV4(materials) {
        const eyeGroup = new THREE.Group();
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), materials.white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        pupil.position.z = 0.04;
        eyeGroup.add(eye, pupil);
        return eyeGroup;
    }

    // --- LEVEL 2 ENTITIES ---

    createFoxDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Body
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), materials.foxOrange);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), materials.foxOrange);
        head.position.set(0.6, 0.2, 0);
        group.add(head);

        // Snout
        const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 8), materials.foxCream);
        snout.position.set(0.8, 0.15, 0);
        snout.rotation.z = -Math.PI / 2;
        group.add(snout);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), materials.black);
        nose.position.set(0.9, 0.15, 0);
        group.add(nose);

        // Ears
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), materials.darkBrown);
        ear.position.set(0.6, 0.4, 0.15);
        ear.rotation.x = -Math.PI / 6;
        group.add(ear);
        const ear2 = ear.clone();
        ear2.position.z = -0.15;
        ear2.rotation.x = Math.PI / 6;
        group.add(ear2);

        // Legs
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 6), materials.darkBrown);
            leg.position.set(i < 2 ? 0.3 : -0.3, -0.3, i % 2 === 0 ? 0.2 : -0.2);
            group.add(leg);
        }

        // Tail
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.7, 4, 8), materials.foxOrange);
        tail.position.set(-0.8, 0.3, 0);
        tail.rotation.z = Math.PI / 4;
        group.add(tail);
        const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), materials.foxCream);
        tailTip.position.set(-1.1, 0.6, 0);
        group.add(tailTip);

        return group;
    }

    createRabbitDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), materials.white);
        body.scale.y = 0.8;
        group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), materials.white);
        head.position.set(0, 0.4, 0);
        group.add(head);

        // Ears
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.6, 4, 8), materials.white);
        ear.position.set(0.1, 0.8, 0);
        ear.rotation.z = -Math.PI / 12;
        group.add(ear);
        const ear2 = ear.clone();
        ear2.position.x = -0.1;
        ear2.rotation.z = Math.PI / 12;
        group.add(ear2);

        // Eyes
        const eye1 = this.createEyeV4(materials);
        eye1.position.set(0.1, 0.45, 0.2);
        group.add(eye1);
        const eye2 = this.createEyeV4(materials);
        eye2.position.set(-0.1, 0.45, 0.2);
        group.add(eye2);

        // Nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshLambertMaterial({ color: 0xFFC0CB }));
        nose.position.set(0, 0.4, 0.25);
        group.add(nose);

        // Legs with feet
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.4, 6), materials.white);
            leg.position.set(i < 2 ? 0.15 : -0.15, -0.2, i % 2 === 0 ? 0.15 : -0.15);
            group.add(leg);
            
            // Add feet
            const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), materials.white);
            foot.position.set(i < 2 ? 0.15 : -0.15, -0.4, i % 2 === 0 ? 0.15 : -0.15);
            foot.scale.set(1, 0.3, 1); // Flatten feet
            group.add(foot);
        }

        // Tail
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), materials.white);
        tail.position.set(0, 0.1, -0.4);
        group.add(tail);

        return group;
    }

    createOwlDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), materials.brown);
        body.scale.set(1, 1.2, 1);
        group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), materials.darkBrown);
        head.position.y = 0.6;
        group.add(head);

        // Eyes
        const eyeSocket = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), materials.tan);
        eyeSocket.position.set(0.15, 0.65, 0.2);
        group.add(eyeSocket);
        const eyeSocket2 = eyeSocket.clone();
        eyeSocket2.position.x = -0.15;
        group.add(eyeSocket2);

        const eye1 = this.createEyeV4(materials);
        eye1.scale.set(2, 2, 2);
        eye1.position.set(0.15, 0.65, 0.25);
        group.add(eye1);
        const eye2 = eye1.clone();
        eye2.position.x = -0.15;
        group.add(eye2);

        // Beak
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), materials.gold);
        beak.position.set(0, 0.55, 0.3);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);
        // Majestic outspread wings (eagle/angel style)
        const featherMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513, side: THREE.DoubleSide }); // Same brown as body

        function makeFeather(length, thickness = 0.06) {
            return new THREE.Mesh(new THREE.BoxGeometry(length, thickness, 0.15), featherMaterial);
        }

        function buildWing(isLeft = true) {
            const wing = new THREE.Group();
            const baseX = isLeft ? -0.6 : 0.6;
            const dir = isLeft ? -1 : 1;

            // Create 4 layered rows of feathers (proximal -> distal)
            const rows = [
                { len: 0.22, count: 6, y: 0.0, z: 0.0, tilt: Math.PI / 12 },
                { len: 0.32, count: 5, y: 0.08, z: 0.05, tilt: Math.PI / 20 },
                { len: 0.44, count: 4, y: 0.18, z: 0.12, tilt: Math.PI / 30 },
                { len: 0.6, count: 3, y: 0.32, z: 0.24, tilt: Math.PI / 40 }
            ];

            rows.forEach((r, rowIdx) => {
                const rowGroup = new THREE.Group();
                for (let i = 0; i < r.count; i++) {
                    const feather = makeFeather(r.len);
                    // spread feathers along wing span, offset outward and slightly rotated
                    const span = (i - (r.count - 1) / 2) * (r.len * 0.5);
                    feather.position.set(span * dir, r.y + rowIdx * 0.02, r.z + i * 0.02);
                    feather.rotation.z = (dir * 0.15) + (i - r.count / 2) * 0.02 + r.tilt;
                    feather.rotation.y = (isLeft ? Math.PI / 20 : -Math.PI / 20);
                    rowGroup.add(feather);
                }
                wing.add(rowGroup);
            });

            // Slight arch and rotate for outspread pose
            wing.position.set(baseX, 0.15, 0.0);
            wing.rotation.z = isLeft ? Math.PI / 8 : -Math.PI / 8;
            wing.rotation.y = isLeft ? Math.PI / 12 : -Math.PI / 12;
            return wing;
        }

        const leftWing = buildWing(true);
        group.add(leftWing);
        const rightWing = buildWing(false);
        group.add(rightWing);

        // Owl "ear" tufts
        const tuft1 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), materials.darkBrown);
        tuft1.position.set(0.15, 0.9, 0.1);
        tuft1.rotation.x = -Math.PI / 4;
        group.add(tuft1);
        const tuft2 = tuft1.clone();
        tuft2.position.z = -0.1;
        tuft2.rotation.x = Math.PI / 4;
        group.add(tuft2);

        return group;
    }

    createDeerDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Body (reddish brown) - improved proportions, 20% shorter
        const deerBrown = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // SaddleBrown
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.12, 4, 8), deerBrown);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Neck - moved to very front of body
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.7, 8), deerBrown);
        neck.position.set(0.7, 0.6, 0);
        neck.rotation.z = -Math.PI / 8;
        group.add(neck);

        // Head - moved to very front of body
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), deerBrown);
        head.position.set(1.1, 0.9, 0);
        group.add(head);

        // Snout - adjusted for new head position
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 6), deerBrown);
        snout.position.set(1.28, 0.82, 0);
        snout.rotation.z = -Math.PI / 2;
        group.add(snout);

        // Nose - adjusted for new snout position
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), materials.black);
        nose.position.set(1.42, 0.82, 0);
        group.add(nose);

        // Eyes - black dot eyes adjusted for new head position
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        eye1.position.set(1.02, 0.95, 0.12);
        group.add(eye1);
        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        eye2.position.set(1.02, 0.95, -0.12);
        group.add(eye2);

        // Antlers - adjusted for new head position
        const antlerMaterial = materials.darkBrown;
        // Left antler base
        const antlerBaseL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 4), antlerMaterial);
        antlerBaseL.position.set(1.1, 1.1, 0.12);
        antlerBaseL.rotation.z = Math.PI / 3;
        antlerBaseL.rotation.x = -Math.PI / 6;
        group.add(antlerBaseL);

        // Right antler base
        const antlerBaseR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 4), antlerMaterial);
        antlerBaseR.position.set(1.1, 1.1, -0.12);
        antlerBaseR.rotation.z = -Math.PI / 3;
        antlerBaseR.rotation.x = Math.PI / 6;
        group.add(antlerBaseR);

        // Antler tines - adjusted for new antler base positions
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 3; i++) {
                const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.25, 4), antlerMaterial);
                tine.position.set(
                    1.1 + side * 0.15 + Math.sin(i * 0.5) * 0.1,
                    1.25 + i * 0.08,
                    side * 0.12
                );
                tine.rotation.z = side > 0 ? Math.PI / 4 : -Math.PI / 4;
                group.add(tine);
            }
        }

        // Legs - improved proportions and positioning
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.9, 6), deerBrown);
            leg.position.set(i < 2 ? 0.35 : -0.35, -0.6, i % 2 === 0 ? 0.18 : -0.18);
            group.add(leg);
        }

        // Tail - moved to very back end of body
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), materials.white);
        tail.position.set(-0.7, 0.4, 0);
        tail.scale.set(1.3, 1.5, 1.3); // More puffy and upright
        group.add(tail);

        return group;
    }

    createSquirrelDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), materials.brown);
        body.position.y = 0.3;
        group.add(body);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), materials.brown);
        head.position.set(0, 0.6, 0.1);
        group.add(head);

        // Ears
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 6), materials.brown);
        ear.position.set(0.08, 0.75, 0.1);
        ear.rotation.x = -Math.PI / 6;
        group.add(ear);
        const ear2 = ear.clone();
        ear2.position.x = -0.08;
        ear2.rotation.x = Math.PI / 6;
        group.add(ear2);

        // Eyes
        const eye1 = this.createEyeV4(materials);
        eye1.position.set(0.08, 0.65, 0.25);
        group.add(eye1);
        const eye2 = this.createEyeV4(materials);
        eye2.position.set(-0.08, 0.65, 0.25);
        group.add(eye2);

        // Nose
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        nose.position.set(0, 0.6, 0.3);
        group.add(nose);

        // Legs with feet
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.3, 6), materials.brown);
            leg.position.set(i < 2 ? 0.12 : -0.12, 0.1, i % 2 === 0 ? 0.12 : -0.12);
            group.add(leg);
            
            // Add feet
            const foot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), materials.brown);
            foot.position.set(i < 2 ? 0.12 : -0.12, -0.05, i % 2 === 0 ? 0.12 : -0.12);
            foot.scale.set(1, 0.3, 1); // Flatten feet
            group.add(foot);
        }

        // Tail
        const tailGroup = new THREE.Group();
        let parent = tailGroup;
        for (let i = 0; i < 5; i++) {
            const segment = new THREE.Mesh(new THREE.SphereGeometry(0.15 - i * 0.01, 8, 6), materials.darkBrown);
            segment.position.y = 0.2;
            parent.add(segment);
            parent = segment;
        }
        tailGroup.position.set(0, 0.1, -0.2);
        tailGroup.rotation.x = -Math.PI / 3;
        group.add(tailGroup);

        // Acorn
        const acorn = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.1, 4, 8), materials.tan);
        acorn.position.set(0, 0.4, 0.3);
        group.add(acorn);

        return group;
    }

    // --- LEVEL 3 ENTITIES ---

    createDragonDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Main body - serpentine/reptilian form
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.3, 2.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest green scales
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Four powerful legs with claws
        const legPositions = [
            [-0.4, -0.8, 0.3],   // Front left
            [0.4, -0.8, 0.3],    // Front right
            [-0.4, -0.8, -0.3],  // Back left
            [0.4, -0.8, -0.3]    // Back right
        ];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6), materials.dragonScale);
            leg.position.set(pos[0], pos[1], pos[2]);
            group.add(leg);
            
            // Add claws
            for (let i = 0; i < 3; i++) {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), materials.darkBrown);
                claw.position.set(
                    pos[0] + (i - 1) * 0.08,
                    pos[1] - 0.7,
                    pos[2]
                );
                claw.rotation.x = Math.PI / 2;
                group.add(claw);
            }
        });

        // Long neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.5, 6), materials.dragonScale);
        neck.position.set(0, 0.8, 0);
        neck.rotation.x = -Math.PI / 6;
        group.add(neck);

        // Dragon head with snout
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), materials.dragonScale);
        head.position.set(0, 1.8, 0.3);
        group.add(head);

        // Long snout
        const snout = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 6), materials.dragonScale);
        snout.position.set(0, 1.8, 0.8);
        snout.rotation.x = Math.PI / 2;
        group.add(snout);

        // Nostrils (for fire breathing)
        const nostril1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), materials.black);
        nostril1.position.set(0.1, 1.9, 1.1);
        group.add(nostril1);
        const nostril2 = nostril1.clone();
        nostril2.position.x = -0.1;
        group.add(nostril2);

        // Eyes
        const eye1 = this.createEyeV4(materials);
        eye1.position.set(0.2, 2.0, 0.5);
        group.add(eye1);
        const eye2 = this.createEyeV4(materials);
        eye2.position.set(-0.2, 2.0, 0.5);
        group.add(eye2);

        // Large horns
        const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), materials.darkBrown);
        horn1.position.set(0.3, 2.2, 0.2);
        horn1.rotation.x = -Math.PI / 4;
        group.add(horn1);
        const horn2 = horn1.clone();
        horn2.position.x = -0.3;
        group.add(horn2);

        // Large bat-like wings
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.5), materials.dragonWing);
        wing.position.set(1.0, 0.5, 0.8);
        wing.rotation.y = Math.PI / 6;
        wing.rotation.z = Math.PI / 8;
        group.add(wing);

        const wing2 = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.5), materials.dragonWing);
        wing2.position.set(-1.0, 0.5, 0.8);
        wing2.rotation.y = -Math.PI / 6;
        wing2.rotation.z = -Math.PI / 8;
        group.add(wing2);

        // Wing membranes and bones
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 4; i++) {
                const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 4), materials.darkBrown);
                bone.position.set(side * 1.0, 0.5, 0.8 + i * 0.2);
                bone.rotation.z = side > 0 ? Math.PI / 8 : -Math.PI / 8;
                group.add(bone);
            }
        }

        // Powerful tail
        const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 2.0, 6), materials.dragonScale);
        tailBase.position.set(0, -0.5, -1.5);
        tailBase.rotation.x = Math.PI / 6;
        group.add(tailBase);

        // Tail spikes
        for (let i = 0; i < 8; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), materials.darkBrown);
            spike.position.set(
                Math.sin(i * 0.4) * 0.2,
                -0.5 - i * 0.2,
                -1.5 - i * 0.3
            );
            spike.rotation.x = Math.PI / 2;
            group.add(spike);
        }

        // Scale pattern details
        for (let i = 0; i < 20; i++) {
            const scale = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), materials.dragonScale);
            scale.position.set(
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.0
            );
            scale.scale.set(1, 0.2, 1); // Flatten scales
            group.add(scale);
        }

        return group;
    }

    createPhoenixDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Main body - bird-like form
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), materials.phoenixRed);
        body.scale.set(1, 1.3, 1);
        group.add(body);

        // Long elegant neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.0, 6), materials.phoenixOrange);
        neck.position.set(0, 0.8, 0);
        neck.rotation.x = -Math.PI / 8;
        group.add(neck);

        // Majestic head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), materials.phoenixYellow);
        head.position.set(0, 1.5, 0.1);
        group.add(head);

        // Large curved beak
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 6), materials.gold);
        beak.position.set(0, 1.4, 0.4);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);

        // Prominent crest on head (like a peacock)
        for (let i = 0; i < 7; i++) {
            const crestFeather = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.5), materials.phoenixYellow);
            crestFeather.position.set(
                (i - 3) * 0.06,
                1.8 + Math.random() * 0.2,
                0.1
            );
            crestFeather.rotation.x = -Math.PI / 6;
            crestFeather.rotation.y = Math.random() * 0.3;
            group.add(crestFeather);
        }

        // Large expressive eyes
        const eye1 = this.createEyeV4(materials);
        eye1.scale.set(1.5, 1.5, 1.5);
        eye1.position.set(0.15, 1.55, 0.3);
        group.add(eye1);
        const eye2 = this.createEyeV4(materials);
        eye2.scale.set(1.5, 1.5, 1.5);
        eye2.position.set(-0.15, 1.55, 0.3);
        group.add(eye2);

        // Powerful legs with talons
        const legPositions = [
            [-0.2, -0.4, 0.1],
            [0.2, -0.4, 0.1]
        ];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6), materials.phoenixOrange);
            leg.position.set(pos[0], pos[1], pos[2]);
            group.add(leg);
            
            // Add talons
            for (let i = 0; i < 4; i++) {
                const talon = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 4), materials.darkBrown);
                talon.position.set(
                    pos[0] + (i - 1.5) * 0.04,
                    pos[1] - 0.45,
                    pos[2]
                );
                talon.rotation.x = Math.PI / 2;
                group.add(talon);
            }
        });

        // Large majestic wings (eagle-like)
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.2), materials.phoenixRed);
        wing.position.set(0.9, 0.4, 0.5);
        wing.rotation.y = Math.PI / 8;
        wing.rotation.z = Math.PI / 12;
        group.add(wing);

        const wing2 = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.2), materials.phoenixRed);
        wing2.position.set(-0.9, 0.4, 0.5);
        wing2.rotation.y = -Math.PI / 8;
        wing2.rotation.z = -Math.PI / 12;
        group.add(wing2);

        // Wing feathers - layered and detailed
        for (let side = -1; side <= 1; side += 2) {
            for (let layer = 0; layer < 4; layer++) {
                for (let i = 0; i < 8; i++) {
                    const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.8), materials.phoenixOrange);
                    feather.position.set(
                        side * (0.9 + i * 0.08),
                        0.4 + layer * 0.1,
                        0.5 + i * 0.04
                    );
                    feather.rotation.y = side > 0 ? Math.PI / 8 : -Math.PI / 8;
                    feather.rotation.z = Math.random() * 0.3;
                    group.add(feather);
                }
            }
        }

        // Long magnificent tail (peacock-like)
        const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6), materials.phoenixRed);
        tailBase.position.set(0, 0.2, -0.8);
        tailBase.rotation.x = Math.PI / 4;
        group.add(tailBase);

        // Spectacular tail feathers
        const tailColors = [materials.phoenixRed, materials.phoenixOrange, materials.phoenixYellow, materials.gold];
        for (let i = 0; i < 12; i++) {
            const tailFeather = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.0), tailColors[i % tailColors.length]);
            tailFeather.position.set(
                (i - 5.5) * 0.08,
                0.5,
                -1.2 - Math.abs(i - 5.5) * 0.1
            );
            tailFeather.rotation.x = Math.PI / 3;
            tailFeather.rotation.y = (i - 5.5) * 0.1;
            group.add(tailFeather);
        }

        // Fire-like plumage details
        for (let i = 0; i < 15; i++) {
            const plume = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.6), materials.phoenixYellow);
            plume.position.set(
                (Math.random() - 0.5) * 1.2,
                Math.random() * 1.0,
                (Math.random() - 0.5) * 0.8
            );
            plume.rotation.y = Math.random() * Math.PI;
            group.add(plume);
        }

        return group;
    }

    createUnicornDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Body (white, exact deer structure)
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.12, 4, 8), materials.white);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Neck - moved to very front of body
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.7, 8), materials.white);
        neck.position.set(0.7, 0.6, 0);
        neck.rotation.z = -Math.PI / 8;
        group.add(neck);

        // Head - moved to very front of body
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), materials.white);
        head.position.set(1.1, 0.9, 0);
        group.add(head);

        // Snout - adjusted for new head position
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 6), materials.white);
        snout.position.set(1.28, 0.82, 0);
        snout.rotation.z = -Math.PI / 2;
        group.add(snout);

        // Nose - adjusted for new snout position
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), materials.black);
        nose.position.set(1.42, 0.82, 0);
        group.add(nose);

        // Eyes - black dot eyes adjusted for new head position
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        eye1.position.set(1.02, 0.95, 0.12);
        group.add(eye1);
        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), materials.black);
        eye2.position.set(1.02, 0.95, -0.12);
        group.add(eye2);

        // Single golden horn in center of forehead
        const hornMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, 
            metalness: 0.9, 
            roughness: 0.25, 
            emissive: 0x222200, 
            emissiveIntensity: 0.05 
        });
        
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.8, 12), hornMaterial);
        horn.position.set(1.1, 1.4, 0);
        horn.rotation.x = -Math.PI / 20;
        group.add(horn);

        // Add spiral ridges on horn
        for (let i = 0; i < 8; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035 - i * 0.003, 0.006, 6, 12), hornMaterial);
            ring.position.set(1.1, 1.15 + i * 0.04, 0);
            ring.rotation.x = Math.PI / 2;
            ring.rotation.z = i * 0.3; // Spiral effect
            group.add(ring);
        }

        // Legs - same positioning as deer
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.9, 6), materials.white);
            leg.position.set(i < 2 ? 0.35 : -0.35, -0.6, i % 2 === 0 ? 0.18 : -0.18);
            group.add(leg);
        }

        // Horse tail flowing downward with rainbow highlights
        const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.6, 8), materials.white);
        tailBase.position.set(-0.7, 0.3, 0);
        tailBase.rotation.z = Math.PI / 6; // Angled downward
        group.add(tailBase);

        // Horse tail hairs with rainbow colors
        const rainbowColors = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x8b00ff];
        for (let i = 0; i < 15; i++) {
            let material;
            if (i < 8) {
                material = materials.white; // Base white hairs
            } else {
                const color = rainbowColors[(i - 8) % rainbowColors.length];
                material = new THREE.MeshLambertMaterial({ 
                    color: color, 
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });
            }
            
            const hair = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.7), material);
            hair.position.set(-0.85 - i * 0.04, 0.15 - i * 0.05, (i - 7) * 0.03);
            hair.rotation.z = Math.PI / 4; // Flowing downward
            hair.rotation.y = Math.random() * 0.2 - 0.1;
            group.add(hair);
        }

        // Rainbow highlights around the mane area
        for (let i = 0; i < 7; i++) {
            const color = rainbowColors[i];
            const material = new THREE.MeshLambertMaterial({ 
                color: color, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            const highlight = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.3), material);
            highlight.position.set(0.8 + i * 0.03, 0.8 + i * 0.04, -0.1 - i * 0.02);
            highlight.rotation.y = Math.random() * 0.3;
            highlight.rotation.z = -0.1;
            group.add(highlight);
        }

        return group;
    }

    createGriffinDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Lion body (more detailed and majestic)
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2, 4, 8), materials.tan);
        body.rotation.z = Math.PI / 2;
        body.position.x = -0.1;
        group.add(body);

        // Lion legs with paws
        const legPositions = [
            [-0.4, -0.6, 0.25],   // Front left
            [0.2, -0.6, 0.25],    // Front right
            [-0.4, -0.6, -0.25],  // Back left
            [0.2, -0.6, -0.25]    // Back right
        ];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 6), materials.tan);
            leg.position.set(pos[0], pos[1], pos[2]);
            group.add(leg);
            
            // Add paws
            const paw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), materials.tan);
            paw.position.set(pos[0], pos[1] - 0.5, pos[2]);
            paw.scale.set(1, 0.3, 1); // Flatten paws
            group.add(paw);
        });

        // Lion neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 6), materials.tan);
        neck.position.set(0, 0.7, 0);
        neck.rotation.x = -Math.PI / 12;
        group.add(neck);

        // Eagle head (majestic and sharp)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), materials.white);
        head.position.set(0, 1.3, 0.1);
        head.scale.set(1, 0.85, 1.3); // More elongated eagle-like head
        group.add(head);

        // Sharp eagle beak
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 4), materials.gold);
        beak.position.set(0, 1.2, 0.5);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);

        // Eagle eyes (prominent and piercing)
        const eye1 = this.createEyeV4(materials);
        eye1.scale.set(1.2, 1.2, 1.2);
        eye1.position.set(0.18, 1.35, 0.3);
        group.add(eye1);
        const eye2 = this.createEyeV4(materials);
        eye2.scale.set(1.2, 1.2, 1.2);
        eye2.position.set(-0.18, 1.35, 0.3);
        group.add(eye2);

        // Eagle crest (feathers on head)
        for (let i = 0; i < 8; i++) {
            const crest = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4), materials.darkBrown);
            crest.position.set(
                (i - 3.5) * 0.08,
                1.6 + Math.random() * 0.2,
                0.1
            );
            crest.rotation.x = -Math.PI / 6;
            crest.rotation.y = Math.random() * 0.2;
            group.add(crest);
        }

        // Large majestic eagle wings
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.8), materials.darkBrown);
        wing.position.set(0.8, 0.5, 0.6);
        wing.rotation.y = Math.PI / 8;
        wing.rotation.z = Math.PI / 10;
        group.add(wing);

        const wing2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.8), materials.darkBrown);
        wing2.position.set(-0.8, 0.5, 0.6);
        wing2.rotation.y = -Math.PI / 8;
        wing2.rotation.z = -Math.PI / 10;
        group.add(wing2);

        // Wing feathers (layered for majesty)
        for (let side = -1; side <= 1; side += 2) {
            for (let layer = 0; layer < 3; layer++) {
                for (let i = 0; i < 10; i++) {
                    const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.6), materials.white);
                    feather.position.set(
                        side * (0.8 + i * 0.06),
                        0.5 + layer * 0.08,
                        0.6 + i * 0.03
                    );
                    feather.rotation.y = side > 0 ? Math.PI / 8 : -Math.PI / 8;
                    feather.rotation.z = Math.random() * 0.3;
                    group.add(feather);
                }
            }
        }

        // Lion tail with majestic tuft
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.2, 6), materials.tan);
        tail.position.set(-0.6, 0.4, 0);
        tail.rotation.z = Math.PI / 6;
        group.add(tail);

        // Large lion tail tuft
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), materials.darkBrown);
        tuft.position.set(-1.0, 0.4, 0);
        group.add(tuft);

        // Detailed lion mane (majestic and full)
        for (let i = 0; i < 20; i++) {
            const maneHair = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.5), materials.darkBrown);
            maneHair.position.set(
                0.3 + Math.random() * 0.6,
                0.8 + Math.random() * 0.4,
                (Math.random() - 0.5) * 0.8
            );
            maneHair.rotation.y = Math.random() * Math.PI;
            maneHair.rotation.z = Math.random() * 0.5;
            group.add(maneHair);
        }

        // Add some scale-like details on the body
        for (let i = 0; i < 12; i++) {
            const scale = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), materials.tan);
            scale.position.set(
                (Math.random() - 0.5) * 1.0,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.6
            );
            scale.scale.set(1, 0.3, 1); // Flatten scales
            group.add(scale);
        }

        return group;
    }

    createPegasusDirect() {
        const group = new THREE.Group();
        const materials = this.createSharedMaterialsV4();

        // Body (white, 2x the size of deer)
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 2.24, 4, 8), materials.white);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Neck - moved to very front of body (2x size)
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.4, 8), materials.white);
        neck.position.set(1.4, 1.2, 0);
        neck.rotation.z = -Math.PI / 8;
        group.add(neck);

        // Head - moved to very front of body (2x size)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 8), materials.white);
        head.position.set(2.2, 1.8, 0);
        group.add(head);

        // Snout - adjusted for new head position (2x size)
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 6), materials.white);
        snout.position.set(2.56, 1.64, 0);
        snout.rotation.z = -Math.PI / 2;
        group.add(snout);

        // Nose - adjusted for new snout position (2x size)
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), materials.black);
        nose.position.set(2.84, 1.64, 0);
        group.add(nose);

        // Eyes - black dot eyes adjusted for new head position (2x size)
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), materials.black);
        eye1.position.set(2.04, 1.9, 0.24);
        group.add(eye1);
        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), materials.black);
        eye2.position.set(2.04, 1.9, -0.24);
        group.add(eye2);

        // No horn (pegasus doesn't have one)

        // Legs - improved proportions and positioning (2x size)
        for (let i = 0; i < 4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 1.8, 6), materials.white);
            leg.position.set(i < 2 ? 0.7 : -0.7, -1.2, i % 2 === 0 ? 0.36 : -0.36);
            group.add(leg);
        }

        // Horse tail at back end (2x size) - flowing downward like a real horse
        const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6), materials.white);
        tailBase.position.set(-1.4, 0.4, 0);
        tailBase.rotation.z = Math.PI / 4; // Angled downward
        group.add(tailBase);

        // Tail hairs flowing down
        for (let i = 0; i < 12; i++) {
            const tailHair = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.8), materials.white);
            tailHair.position.set(-1.6 - i * 0.1, 0.2 - i * 0.1, (i - 5.5) * 0.08);
            tailHair.rotation.z = Math.PI / 3; // Flowing downward
            tailHair.rotation.y = Math.random() * 0.2 - 0.1; // Slight random variation
            group.add(tailHair);
        }

        // Large eagle wings (outspread)
        const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });

        function makeFeather(length, thickness = 0.08) {
            return new THREE.Mesh(new THREE.BoxGeometry(length, thickness, 0.2), wingMaterial);
        }

        function buildWing(isLeft = true) {
            const wing = new THREE.Group();
            const baseX = isLeft ? -1.2 : 1.2;
            const dir = isLeft ? -1 : 1;

            // Create 4 layered rows of feathers (larger for pegasus)
            const rows = [
                { len: 0.4, count: 8, y: 0.0, z: 0.0, tilt: Math.PI / 12 },
                { len: 0.6, count: 6, y: 0.15, z: 0.1, tilt: Math.PI / 20 },
                { len: 0.8, count: 5, y: 0.35, z: 0.25, tilt: Math.PI / 30 },
                { len: 1.2, count: 4, y: 0.6, z: 0.45, tilt: Math.PI / 40 }
            ];

            rows.forEach((r, rowIdx) => {
                const rowGroup = new THREE.Group();
                for (let i = 0; i < r.count; i++) {
                    const feather = makeFeather(r.len);
                    // spread feathers along wing span, offset outward and slightly rotated
                    const span = (i - (r.count - 1) / 2) * (r.len * 0.6);
                    feather.position.set(span * dir, r.y + rowIdx * 0.03, r.z + i * 0.03);
                    feather.rotation.z = (dir * 0.2) + (i - r.count / 2) * 0.03 + r.tilt;
                    feather.rotation.y = (isLeft ? Math.PI / 15 : -Math.PI / 15);
                    rowGroup.add(feather);
                }
                wing.add(rowGroup);
            });

            // Slight arch and rotate for outspread pose
            wing.position.set(baseX, 0.6, 0.0);
            wing.rotation.z = isLeft ? Math.PI / 6 : -Math.PI / 6;
            wing.rotation.y = (isLeft ? Math.PI / 10 : -Math.PI / 10) + Math.PI / 2; // Added 90 degrees Y rotation
            return wing;
        }

        const leftWing = buildWing(true);
        group.add(leftWing);
        const rightWing = buildWing(false);
        group.add(rightWing);

        return group;
    }

    createEntityWithComplexity(EntityClass, entityType) {
        try {
            const entity = new EntityClass(this.scene);
            
            // Apply complexity modifications
            if (this.currentComplexity !== 'simple') {
                this.enhanceEntityComplexity(entity, entityType, this.currentComplexity);
            }
            
            // Enable shadows
            if (entity.group) {
                entity.group.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            }
            
            return entity;
        } catch (error) {
            console.warn(`Failed to create ${entityType}:`, error);
            return null;
        }
    }

    enhanceEntityComplexity(entity, entityType, complexity) {
        if (!entity.group) return;

        switch (complexity) {
            case 'medium':
                this.applyMediumComplexity(entity, entityType);
                break;
            case 'detailed':
                this.applyDetailedComplexity(entity, entityType);
                break;
        }
    }

    applyMediumComplexity(entity, entityType) {
        // Add medium complexity enhancements
        switch (entityType) {
            case 'rabbit':
                this.enhanceRabbit(entity, 'medium');
                break;
            case 'squirrel':
                this.enhanceSquirrel(entity, 'medium');
                break;
            case 'owl':
                this.enhanceOwl(entity, 'medium');
                break;
            case 'fox':
                this.enhanceFox(entity, 'medium');
                break;
            case 'deer':
                this.enhanceDeer(entity, 'medium');
                break;
            case 'dragon':
                this.enhanceDragon(entity, 'medium');
                break;
            case 'phoenix':
                this.enhancePhoenix(entity, 'medium');
                break;
            case 'unicorn':
                this.enhanceUnicorn(entity, 'medium');
                break;
            case 'griffin':
                this.enhanceGriffin(entity, 'medium');
                break;
            case 'pegasus':
                this.enhancePegasus(entity, 'medium');
                break;
        }
    }

    applyDetailedComplexity(entity, entityType) {
        // Add detailed complexity enhancements
        switch (entityType) {
            case 'rabbit':
                this.enhanceRabbit(entity, 'detailed');
                break;
            case 'squirrel':
                this.enhanceSquirrel(entity, 'detailed');
                break;
            case 'owl':
                this.enhanceOwl(entity, 'detailed');
                break;
            case 'fox':
                this.enhanceFox(entity, 'detailed');
                break;
            case 'deer':
                this.enhanceDeer(entity, 'detailed');
                break;
            case 'dragon':
                this.enhanceDragon(entity, 'detailed');
                break;
            case 'phoenix':
                this.enhancePhoenix(entity, 'detailed');
                break;
            case 'unicorn':
                this.enhanceUnicorn(entity, 'detailed');
                break;
            case 'griffin':
                this.enhanceGriffin(entity, 'detailed');
                break;
            case 'pegasus':
                this.enhancePegasus(entity, 'detailed');
                break;
        }
    }

    // ============================================================================
    // ENTITY ENHANCEMENT FUNCTIONS
    // ============================================================================

    enhanceRabbit(entity, level) {
        if (!entity.group) return;

        // Better proportions - longer ears, smaller body
        const ears = entity.group.children.filter(child => 
            child.geometry && child.geometry.type === 'ConeGeometry'
        );
        ears.forEach(ear => {
            ear.scale.set(0.8, 1.4, 0.8); // Thinner, taller ears
        });

        if (level === 'medium' || level === 'detailed') {
            // Add whiskers
            this.addWhiskers(entity.group, 0.8);
            
            // Add pink nose
            const noseGeometry = new THREE.SphereGeometry(0.08, 6, 4);
            const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xff69b4 });
            const nose = new THREE.Mesh(noseGeometry, noseMaterial);
            nose.position.set(0, 0.2, 0.9);
            entity.group.add(nose);

            // Better tail - fluffy
            const tail = entity.group.children.find(child => 
                child.position.z < -0.5 && child.geometry?.type === 'SphereGeometry'
            );
            if (tail) {
                tail.scale.set(1.2, 1.2, 1.2);
                tail.material.color.setHex(0xffffff);
            }
        }

        if (level === 'detailed') {
            // Inner ear detail
            ears.forEach(ear => {
                const innerEarGeometry = new THREE.ConeGeometry(0.12, 0.3, 6);
                const innerEarMaterial = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });
                const innerEar = new THREE.Mesh(innerEarGeometry, innerEarMaterial);
                innerEar.position.copy(ear.position);
                innerEar.position.z += 0.1;
                innerEar.rotation.copy(ear.rotation);
                innerEar.scale.set(0.6, 0.7, 0.6);
                entity.group.add(innerEar);
            });
        }
    }

    enhanceSquirrel(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Fix tail connection and make it bushier
            const tail = entity.group.children.find(child => 
                child.position.z < -0.5
            );
            if (tail) {
                // Reposition tail to connect properly
                tail.position.set(0, 0.4, -0.6);
                tail.scale.set(1.5, 2, 1.5); // Bushier tail
                
                // Add tail segments for better shape
                for (let i = 1; i <= 3; i++) {
                    const segmentGeometry = new THREE.SphereGeometry(0.3 - i * 0.05, 6, 4);
                    const segmentMaterial = tail.material.clone();
                    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
                    segment.position.set(0, 0.4 + i * 0.3, -0.6 - i * 0.2);
                    entity.group.add(segment);
                }
            }

            // Add small ears
            [-0.2, 0.2].forEach(x => {
                const earGeometry = new THREE.ConeGeometry(0.08, 0.15, 6);
                const earMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                const ear = new THREE.Mesh(earGeometry, earMaterial);
                ear.position.set(x, 0.8, 0.3);
                ear.rotation.x = -0.2;
                entity.group.add(ear);
            });

            // Add cheek pouches
            [-0.15, 0.15].forEach(x => {
                const cheekGeometry = new THREE.SphereGeometry(0.1, 6, 4);
                const cheekMaterial = new THREE.MeshLambertMaterial({ color: 0xd2691e });
                const cheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
                cheek.position.set(x, 0.1, 0.7);
                entity.group.add(cheek);
            });
        }
    }

    enhanceOwl(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Make head more owl-like with large eyes
            const headGeometry = new THREE.SphereGeometry(0.4, 8, 6);
            const headMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.set(0, 0.7, 0);
            entity.group.add(head);

            // Large owl eyes
            [-0.15, 0.15].forEach(x => {
                // Eye whites
                const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 6);
                const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
                const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                eye.position.set(x, 0.75, 0.3);
                entity.group.add(eye);

                // Pupils
                const pupilGeometry = new THREE.SphereGeometry(0.06, 6, 4);
                const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
                const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
                pupil.position.set(x, 0.75, 0.37);
                entity.group.add(pupil);
            });

            // Beak
            const beakGeometry = new THREE.ConeGeometry(0.06, 0.15, 4);
            const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
            const beak = new THREE.Mesh(beakGeometry, beakMaterial);
            beak.position.set(0, 0.6, 0.4);
            beak.rotation.x = Math.PI;
            entity.group.add(beak);

            // Feather tufts on head
            [-0.1, 0.1].forEach(x => {
                const tuftGeometry = new THREE.ConeGeometry(0.04, 0.2, 4);
                const tuftMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
                const tuft = new THREE.Mesh(tuftGeometry, tuftMaterial);
                tuft.position.set(x, 1.1, -0.1);
                tuft.rotation.x = -0.3;
                entity.group.add(tuft);
            });
        }

        if (level === 'detailed') {
            // Wing details
            [-0.4, 0.4].forEach(x => {
                const wingGeometry = new THREE.PlaneGeometry(0.6, 1);
                const wingMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x8b7355,
                    side: THREE.DoubleSide
                });
                const wing = new THREE.Mesh(wingGeometry, wingMaterial);
                wing.position.set(x, 0.3, -0.2);
                wing.rotation.y = x > 0 ? -0.5 : 0.5;
                entity.group.add(wing);
            });
        }
    }

    enhanceFox(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Fix ears - attach them properly to head
            const ears = entity.group.children.filter(child => 
                child.position.y > 0.8 && child.geometry?.type === 'ConeGeometry'
            );
            ears.forEach(ear => {
                ear.position.y = 0.9; // Lower them to attach to head
                ear.scale.set(1, 1.2, 1); // Make more pointed
            });

            // Add distinctive fox features
            // White chest
            const chestGeometry = new THREE.SphereGeometry(0.25, 8, 6);
            const chestMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
            const chest = new THREE.Mesh(chestGeometry, chestMaterial);
            chest.position.set(0, 0, 0.5);
            chest.scale.set(0.8, 1, 0.6);
            entity.group.add(chest);

            // Better snout
            const snoutGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 6);
            const snoutMaterial = new THREE.MeshLambertMaterial({ color: 0xd2691e });
            const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
            snout.position.set(0, 0.2, 0.8);
            snout.rotation.x = Math.PI / 2;
            entity.group.add(snout);

            // Black nose
            const noseGeometry = new THREE.SphereGeometry(0.05, 6, 4);
            const noseMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
            const nose = new THREE.Mesh(noseGeometry, noseMaterial);
            nose.position.set(0, 0.2, 0.95);
            entity.group.add(nose);
        }
    }

    enhanceDeer(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Add proper antlers
            this.addDeerAntlers(entity.group, level);

            // Better proportions - longer legs, thinner body
            const legs = entity.group.children.filter(child => 
                child.position.y < 0 && child.geometry?.type === 'CylinderGeometry'
            );
            legs.forEach(leg => {
                leg.scale.set(0.8, 1.3, 0.8); // Thinner, longer legs
            });

            // Add spotted pattern (for detailed level)
            if (level === 'detailed') {
                for (let i = 0; i < 8; i++) {
                    const spotGeometry = new THREE.SphereGeometry(0.08, 6, 4);
                    const spotMaterial = new THREE.MeshLambertMaterial({ 
                        color: 0x8b4513,
                        transparent: true,
                        opacity: 0.7
                    });
                    const spot = new THREE.Mesh(spotGeometry, spotMaterial);
                    spot.position.set(
                        (Math.random() - 0.5) * 0.8,
                        Math.random() * 0.5,
                        (Math.random() - 0.5) * 0.6
                    );
                    spot.scale.set(1, 0.1, 1); // Flatten spots
                    entity.group.add(spot);
                }
            }
        }
    }

    enhanceUnicorn(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Make body more horse-like and less fat
            const body = entity.group.children.find(child => 
                child.position.y === 0 && child.geometry?.type === 'CylinderGeometry'
            );
            if (body) {
                body.scale.set(0.7, 1, 1.2); // Thinner, longer body
            }

            // Add proper horse legs
            this.addHorseLegs(entity.group);

            // Add iconic horn
            const hornGeometry = new THREE.ConeGeometry(0.04, 0.8, 8);
            const hornMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xffd700,
                shininess: 100
            });
            const horn = new THREE.Mesh(hornGeometry, hornMaterial);
            horn.position.set(0, 1.4, 0.2);
            horn.rotation.x = -0.2;
            entity.group.add(horn);

            // Add mane
            for (let i = 0; i < 5; i++) {
                const maneGeometry = new THREE.PlaneGeometry(0.1, 0.4);
                const maneMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0xffffff,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });
                const mane = new THREE.Mesh(maneGeometry, maneMaterial);
                mane.position.set(
                    (Math.random() - 0.5) * 0.3,
                    1 + Math.random() * 0.3,
                    -0.2 - i * 0.1
                );
                mane.rotation.y = Math.random() * 0.5;
                entity.group.add(mane);
            }
        }
    }

    enhanceDragon(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Add proper dragon wings
            this.addDragonWings(entity.group, level);

            // Long dragon neck
            const neckGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
            const neckMaterial = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
            const neck = new THREE.Mesh(neckGeometry, neckMaterial);
            neck.position.set(0, 0.8, 0.5);
            neck.rotation.x = -0.3;
            entity.group.add(neck);

            // Dragon head
            const headGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.8);
            const head = new THREE.Mesh(headGeometry, neckMaterial);
            head.position.set(0, 1.8, 1);
            entity.group.add(head);

            // Horns
            [-0.15, 0.15].forEach(x => {
                const hornGeometry = new THREE.ConeGeometry(0.05, 0.3, 6);
                const hornMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
                const horn = new THREE.Mesh(hornGeometry, hornMaterial);
                horn.position.set(x, 2.1, 0.8);
                entity.group.add(horn);
            });

            // Dragon tail
            for (let i = 0; i < 4; i++) {
                const segmentGeometry = new THREE.SphereGeometry(0.15 - i * 0.02, 6, 4);
                const segment = new THREE.Mesh(segmentGeometry, neckMaterial);
                segment.position.set(0, 0.2, -1 - i * 0.3);
                entity.group.add(segment);
            }
        }
    }

    enhancePhoenix(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Fire-colored plumage
            const colors = [0xff4500, 0xff6347, 0xffd700, 0xff8c00];
            
            // Tail feathers
            for (let i = 0; i < 8; i++) {
                const featherGeometry = new THREE.PlaneGeometry(0.1, 0.8);
                const featherMaterial = new THREE.MeshLambertMaterial({ 
                    color: colors[i % colors.length],
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });
                const feather = new THREE.Mesh(featherGeometry, featherMaterial);
                feather.position.set(
                    (Math.random() - 0.5) * 0.4,
                    0.5,
                    -1 - Math.random() * 0.5
                );
                feather.rotation.y = Math.random() * Math.PI;
                entity.group.add(feather);
            }

            // Crown feathers
            for (let i = 0; i < 5; i++) {
                const crownGeometry = new THREE.ConeGeometry(0.02, 0.3, 4);
                const crownMaterial = new THREE.MeshLambertMaterial({ 
                    color: colors[i % colors.length]
                });
                const crownFeather = new THREE.Mesh(crownGeometry, crownMaterial);
                crownFeather.position.set(
                    (Math.random() - 0.5) * 0.2,
                    1.2 + Math.random() * 0.2,
                    Math.random() * 0.2
                );
                entity.group.add(crownFeather);
            }
        }
    }

    enhanceGriffin(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Eagle head instead of generic head
            const headGeometry = new THREE.SphereGeometry(0.3, 8, 6);
            const headMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.set(0, 0.8, 0.4);
            head.scale.set(1, 0.8, 1.2); // More elongated
            entity.group.add(head);

            // Eagle beak
            const beakGeometry = new THREE.ConeGeometry(0.08, 0.25, 6);
            const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
            const beak = new THREE.Mesh(beakGeometry, beakMaterial);
            beak.position.set(0, 0.7, 0.8);
            beak.rotation.x = Math.PI / 2;
            entity.group.add(beak);

            // Lion body (already exists, just enhance)
            // Add wings
            this.addGriffinWings(entity.group);

            // Lion tail with tuft
            const tailGeometry = new THREE.CylinderGeometry(0.05, 0.08, 1, 6);
            const tailMaterial = new THREE.MeshLambertMaterial({ color: 0xd2691e });
            const tail = new THREE.Mesh(tailGeometry, tailMaterial);
            tail.position.set(0, 0.3, -1);
            entity.group.add(tail);

            // Tail tuft
            const tuftGeometry = new THREE.SphereGeometry(0.12, 6, 4);
            const tuft = new THREE.Mesh(tuftGeometry, tailMaterial);
            tuft.position.set(0, 0.3, -1.5);
            entity.group.add(tuft);
        }
    }

    enhancePegasus(entity, level) {
        if (!entity.group) return;

        if (level === 'medium' || level === 'detailed') {
            // Horse-like body improvements
            this.enhanceUnicorn(entity, level); // Reuse horse body logic
            
            // Remove horn (pegasus doesn't have one)
            const horn = entity.group.children.find(child => 
                child.position.y > 1.3 && child.geometry?.type === 'ConeGeometry'
            );
            if (horn) {
                entity.group.remove(horn);
            }

            // Add large feathered wings
            this.addPegasusWings(entity.group, level);

            // Change mane to be more natural horse color
            const maneElements = entity.group.children.filter(child => 
                child.material?.transparent && child.position.y > 0.8
            );
            maneElements.forEach(mane => {
                mane.material.color.setHex(0x8b4513); // Brown instead of white
            });
        }
    }

    // ============================================================================
    // HELPER FUNCTIONS FOR COMPLEX FEATURES
    // ============================================================================

    addWhiskers(group, length = 0.6) {
        const whiskerMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        for (let i = 0; i < 6; i++) {
            const whiskerGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(length, 0, 0)
            ]);
            const whisker = new THREE.Line(whiskerGeometry, whiskerMaterial);
            whisker.position.set(
                i < 3 ? 0.4 : -0.4,
                0.1 + (i % 3) * 0.1 - 0.1,
                0.7
            );
            whisker.rotation.y = i < 3 ? -0.3 : 0.3;
            group.add(whisker);
        }
    }

    addDeerAntlers(group, level) {
        const antlerMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7d6b });
        
        [-0.2, 0.2].forEach(x => {
            // Main antler beam
            const antlerGeometry = new THREE.CylinderGeometry(0.03, 0.05, 1, 6);
            const antler = new THREE.Mesh(antlerGeometry, antlerMaterial);
            antler.position.set(x, 1.2, -0.1);
            antler.rotation.z = x < 0 ? 0.3 : -0.3;
            group.add(antler);

            if (level === 'detailed') {
                // Add multiple tines (branches)
                for (let i = 0; i < 4; i++) {
                    const tineGeometry = new THREE.CylinderGeometry(0.01, 0.02, 0.4, 4);
                    const tine = new THREE.Mesh(tineGeometry, antlerMaterial);
                    tine.position.set(
                        x + (x > 0 ? 0.1 : -0.1),
                        1.3 + i * 0.15,
                        -0.1
                    );
                    tine.rotation.z = x < 0 ? 0.6 + i * 0.2 : -0.6 - i * 0.2;
                    group.add(tine);
                }
            }
        });
    }

    addHorseLegs(group) {
        // Remove existing legs and add proper horse legs
        const existingLegs = group.children.filter(child => 
            child.position.y < 0 && child.geometry?.type === 'CylinderGeometry'
        );
        existingLegs.forEach(leg => group.remove(leg));

        // Add 4 proper horse legs
        const legPositions = [
            [-0.3, -0.5, 0.4],   // Front left
            [0.3, -0.5, 0.4],    // Front right
            [-0.3, -0.5, -0.4],  // Back left
            [0.3, -0.5, -0.4]    // Back right
        ];

        legPositions.forEach(pos => {
            const legGeometry = new THREE.CylinderGeometry(0.08, 0.12, 1, 6);
            const legMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            group.add(leg);

            // Add hooves
            const hoofGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.1, 6);
            const hoofMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const hoof = new THREE.Mesh(hoofGeometry, hoofMaterial);
            hoof.position.set(pos[0], pos[1] - 0.55, pos[2]);
            group.add(hoof);
        });
    }

    addDragonWings(group, level) {
        [-1.2, 1.2].forEach(x => {
            // Wing membrane
            const wingGeometry = new THREE.PlaneGeometry(1.5, 2);
            const wingMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x4a0000,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.set(x, 0.8, -0.3);
            wing.rotation.y = x > 0 ? -0.3 : 0.3;
            wing.rotation.z = x > 0 ? 0.2 : -0.2;
            group.add(wing);

            // Wing bones/structure
            if (level === 'detailed') {
                for (let i = 0; i < 3; i++) {
                    const boneGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4);
                    const boneMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
                    const bone = new THREE.Mesh(boneGeometry, boneMaterial);
                    bone.position.set(x * 0.8, 0.8, -0.3);
                    bone.rotation.z = (x > 0 ? -1 : 1) * (0.3 + i * 0.2);
                    group.add(bone);
                }
            }
        });
    }

    addGriffinWings(group) {
        [-0.8, 0.8].forEach(x => {
            // Eagle-style wings with feathers
            const wingGeometry = new THREE.PlaneGeometry(1.2, 1.5);
            const wingMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x8b4513,
                side: THREE.DoubleSide
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.set(x, 0.6, -0.2);
            wing.rotation.y = x > 0 ? -0.4 : 0.4;
            group.add(wing);

            // Wing tip feathers
            for (let i = 0; i < 5; i++) {
                const featherGeometry = new THREE.PlaneGeometry(0.1, 0.4);
                const featherMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x654321,
                    side: THREE.DoubleSide
                });
                const feather = new THREE.Mesh(featherGeometry, featherMaterial);
                feather.position.set(
                    x + (x > 0 ? 0.3 : -0.3),
                    0.4 - i * 0.1,
                    -0.2
                );
                feather.rotation.y = x > 0 ? -0.6 : 0.6;
                group.add(feather);
            }
        });
    }

    addPegasusWings(group, level) {
        [-1, 1].forEach(x => {
            // Large feathered wings
            const wingGeometry = new THREE.PlaneGeometry(1.8, 2.2);
            const wingMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.set(x, 0.8, -0.1);
            wing.rotation.y = x > 0 ? -0.2 : 0.2;
            group.add(wing);

            if (level === 'detailed') {
                // Individual feathers for more detail
                for (let i = 0; i < 8; i++) {
                    const featherGeometry = new THREE.PlaneGeometry(0.15, 0.6);
                    const featherMaterial = new THREE.MeshLambertMaterial({ 
                        color: 0xf5f5f5,
                        side: THREE.DoubleSide
                    });
                    const feather = new THREE.Mesh(featherGeometry, featherMaterial);
                    feather.position.set(
                        x + (x > 0 ? 0.2 : -0.2),
                        0.6 + Math.random() * 0.4,
                        -0.1 + Math.random() * 0.2
                    );
                    feather.rotation.y = x > 0 ? -0.3 : 0.3;
                    feather.rotation.z = Math.random() * 0.2;
                    group.add(feather);
                }
            }
        });
    }

    updateEntityInfo() {
        const currentEntitySpan = document.getElementById('currentEntity');
        const polyCountSpan = document.getElementById('polyCount');
        const performanceSpan = document.getElementById('performance');

        currentEntitySpan.textContent = this.selectedEntity === 'all' ? 'All Entities' : 
            this.selectedEntity.charAt(0).toUpperCase() + this.selectedEntity.slice(1);

        // Calculate approximate polygon count
        let totalPolygons = 0;
        this.currentEntities.forEach(entity => {
            if (entity.group) {
                entity.group.traverse(child => {
                    if (child.geometry) {
                        const positions = child.geometry.attributes.position;
                        if (positions) {
                            totalPolygons += positions.count / 3;
                        }
                    }
                });
            }
        });

        polyCountSpan.textContent = Math.round(totalPolygons).toLocaleString();

        // Performance assessment
        let performance = 'Excellent';
        if (totalPolygons > 5000) performance = 'Good';
        if (totalPolygons > 10000) performance = 'Fair';
        if (totalPolygons > 20000) performance = 'Poor';

        performanceSpan.textContent = performance;
        performanceSpan.style.color = {
            'Excellent': '#2ecc71',
            'Good': '#f39c12',
            'Fair': '#e67e22',
            'Poor': '#e74c3c'
        }[performance];
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.animationEnabled) {
            this.currentEntities.forEach((entity, index) => {
                if (entity.group) {
                    // Rotate entities
                    entity.group.rotation.y += 0.01 * this.rotationSpeed;
                    
                    // Add some floating motion for single entity view
                    if (this.selectedEntity !== 'all') {
                        entity.group.position.y = 3 + Math.sin(Date.now() * 0.001) * 0.5;
                    } else {
                        // Slight bobbing for multiple entities
                        const offset = (entity.showcaseIndex || 0) * 0.5;
                        entity.group.position.y = 3 + Math.sin(Date.now() * 0.001 + offset) * 0.2;
                    }
                }
            });
        }

        if (this.controls) {
            this.controls.update();
        }
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Global functions for controls
function resetCamera() {
    if (window.showcase) {
        window.showcase.camera.position.set(0, 10, 20);
        window.showcase.controls.reset();
    }
}

function toggleAnimation() {
    if (window.showcase) {
        window.showcase.animationEnabled = !window.showcase.animationEnabled;
    }
}

function captureScreenshot() {
    if (window.showcase) {
        const canvas = window.showcase.renderer.domElement;
        const link = document.createElement('a');
        link.download = `entity_showcase_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    console.log('🎭 Starting Entity Showcase...');
    
    // Check if required classes are available
    const requiredClasses = ['BaseInteractiveEntity', 'RabbitEntity', 'DragonEntity'];
    const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');
    
    if (missingClasses.length > 0) {
        console.warn('⚠️ Missing entity classes:', missingClasses);
        console.log('Will create placeholders for missing entities');
    }
    
    // Small delay to ensure all entity classes are loaded
    setTimeout(() => {
        try {
            window.showcase = new EntityShowcase();
            console.log('🎭 Entity Showcase initialized!');
        } catch (error) {
            console.error('❌ Failed to initialize Entity Showcase:', error);
            
            // Show error message in UI
            const controls = document.getElementById('controls');
            if (controls) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'background: #e74c3c; color: white; padding: 10px; border-radius: 5px; margin-top: 10px;';
                errorDiv.innerHTML = '<strong>Error:</strong> Failed to load entity classes. Check console for details.';
                controls.appendChild(errorDiv);
            }
        }
    }, 500);
});
