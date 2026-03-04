/**
 * Christmas Decorations Module
 * Handles all decorative elements for the ChristmasLand world
 * Creates Christmas tree, fireplace, snowman, Santa's house, and North Pole
 */

class ChristmasDecorations {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
        
        console.log('🎄 Christmas decorations system initialized');
    }

    /**
     * Add all Christmas decorative elements
     */
    addAllDecorations() {
        console.log('🎄 Adding all Christmas decorations...');
        
        this.createChristmasTree();
        this.createFireplace();
        this.createSnowman();
        this.createSantasHouse();
        this.createNorthPole();
        this.addChristmasLights();
        this.addChristmasAmbience();
        
        console.log('🎄 Christmas decorations complete');
    }

    /**
     * Create large Christmas tree in corner
     */
    createChristmasTree() {
        console.log('🎄 Creating Christmas tree...');
        
        const treePosition = { x: -80, z: -80 }; // Back left corner
        
        // Create tree trunk
        const trunkGeometry = new this.THREE.CylinderGeometry(3, 4, 8, 8);
        const trunkMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown
            roughness: 0.8,
        });
        
        const trunk = new this.THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(treePosition.x, 4, treePosition.z);
        
        trunk.userData = {
            templateObject: true,
            christmasDecoration: true,
            christmasTree: true,
            treePart: 'trunk',
            preservePosition: true,
            type: 'christmas_tree_trunk'
        };
        
        this.scene.add(trunk);
        this.objects.push(trunk);
        
        // Create tree layers (3 layers getting smaller)
        const layerHeights = [15, 12, 8];
        const layerRadii = [12, 9, 6];
        let currentY = 8;
        
        layerHeights.forEach((height, index) => {
            const layerGeometry = new this.THREE.ConeGeometry(layerRadii[index], height, 8);
            const layerMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x0F5132, // Dark green
                roughness: 0.7,
            });
            
            const layer = new this.THREE.Mesh(layerGeometry, layerMaterial);
            layer.position.set(treePosition.x, currentY + height / 2, treePosition.z);
            
            layer.userData = {
                templateObject: true,
                christmasDecoration: true,
                christmasTree: true,
                treePart: `layer_${index}`,
                preservePosition: true,
                type: 'christmas_tree_layer'
            };
            
            this.scene.add(layer);
            this.objects.push(layer);
            
            currentY += height * 0.7; // Overlap layers slightly
        });
        
        // Add tree star on top
        this.createTreeStar(treePosition.x, currentY + 3, treePosition.z);
        
        // Add ornaments
        this.addTreeOrnaments(treePosition);
        
        console.log('🎄 Christmas tree created');
    }

    /**
     * Create star on top of Christmas tree
     */
    createTreeStar(x, y, z) {
        const starGeometry = new this.THREE.ConeGeometry(1.5, 3, 5);
        const starMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFD700, // Gold
            emissive: 0xFFD700,
            emissiveIntensity: 0.3,
        });
        
        const star = new this.THREE.Mesh(starGeometry, starMaterial);
        star.position.set(x, y, z);
        
        star.userData = {
            templateObject: true,
            christmasDecoration: true,
            christmasTree: true,
            treePart: 'star',
            preservePosition: true,
            type: 'christmas_tree_star'
        };
        
        this.scene.add(star);
        this.objects.push(star);
    }

    /**
     * Add ornaments to Christmas tree
     */
    addTreeOrnaments(treePosition) {
        const ornamentPositions = [
            // Layer 1 ornaments
            { x: treePosition.x - 8, y: 12, z: treePosition.z + 3, color: 0xFF0000 }, // Red
            { x: treePosition.x + 5, y: 14, z: treePosition.z - 6, color: 0x0000FF }, // Blue
            { x: treePosition.x - 3, y: 16, z: treePosition.z + 8, color: 0xFFD700 }, // Gold
            { x: treePosition.x + 7, y: 10, z: treePosition.z + 4, color: 0xC0C0C0 }, // Silver
            
            // Layer 2 ornaments
            { x: treePosition.x - 5, y: 22, z: treePosition.z + 2, color: 0xFF0000 },
            { x: treePosition.x + 4, y: 24, z: treePosition.z - 3, color: 0x0000FF },
            { x: treePosition.x - 2, y: 20, z: treePosition.z + 5, color: 0xFFD700 },
            
            // Layer 3 ornaments
            { x: treePosition.x - 2, y: 30, z: treePosition.z + 1, color: 0xC0C0C0 },
            { x: treePosition.x + 3, y: 32, z: treePosition.z - 2, color: 0xFF0000 },
        ];

        ornamentPositions.forEach((ornament, index) => {
            const geometry = new this.THREE.SphereGeometry(0.8, 8, 6);
            const material = new this.THREE.MeshStandardMaterial({
                color: ornament.color,
                metalness: 0.8,
                roughness: 0.2,
            });
            
            const ornamentMesh = new this.THREE.Mesh(geometry, material);
            ornamentMesh.position.set(ornament.x, ornament.y, ornament.z);
            
            ornamentMesh.userData = {
                templateObject: true,
                christmasDecoration: true,
                christmasTree: true,
                treePart: 'ornament',
                ornamentId: index,
                preservePosition: true,
                type: 'christmas_ornament'
            };
            
            this.scene.add(ornamentMesh);
            this.objects.push(ornamentMesh);
        });
    }

    /**
     * Create fireplace in middle of wall
     */
    createFireplace() {
        console.log('🔥 Creating fireplace...');
        
        const fireplacePosition = { x: 0, z: -149 }; // Center of back wall
        
        // Fireplace base
        const baseGeometry = new this.THREE.BoxGeometry(25, 15, 8);
        const baseMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown brick
            roughness: 0.8,
        });
        
        const base = new this.THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(fireplacePosition.x, 7.5, fireplacePosition.z);
        
        base.userData = {
            templateObject: true,
            christmasDecoration: true,
            fireplace: true,
            fireplacepart: 'base',
            preservePosition: true,
            type: 'fireplace_base'
        };
        
        this.scene.add(base);
        this.objects.push(base);
        
        // Fireplace opening
        const openingGeometry = new this.THREE.BoxGeometry(18, 10, 5);
        const openingMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x000000, // Black interior
        });
        
        const opening = new this.THREE.Mesh(openingGeometry, openingMaterial);
        opening.position.set(fireplacePosition.x, 10, fireplacePosition.z - 1);
        
        opening.userData = {
            templateObject: true,
            christmasDecoration: true,
            fireplace: true,
            fireplacepart: 'opening',
            preservePosition: true,
            type: 'fireplace_opening'
        };
        
        this.scene.add(opening);
        this.objects.push(opening);
        
        // Add fire effect
        this.createFireEffect(fireplacePosition.x, 8, fireplacePosition.z - 2);
        
        // Add mantle
        this.createFireplaceMantle(fireplacePosition);
        
        console.log('🔥 Fireplace created');
    }

    /**
     * Create fire effect in fireplace
     */
    createFireEffect(x, y, z) {
        // Simple fire effect using orange/red spheres
        const firePositions = [
            { x: x - 3, y: y, z: z, scale: 1.2 },
            { x: x + 2, y: y + 1, z: z, scale: 0.8 },
            { x: x, y: y + 2, z: z, scale: 1.0 },
            { x: x - 1, y: y + 1.5, z: z, scale: 0.6 },
        ];

        firePositions.forEach((fire, index) => {
            const geometry = new this.THREE.SphereGeometry(fire.scale, 6, 4);
            const material = new this.THREE.MeshBasicMaterial({
                color: index % 2 === 0 ? 0xFF4500 : 0xFF6347, // Orange/red
                transparent: true,
                opacity: 0.8,
            });
            
            const flame = new this.THREE.Mesh(geometry, material);
            flame.position.set(fire.x, fire.y, fire.z);
            
            flame.userData = {
                templateObject: true,
                christmasDecoration: true,
                fireplace: true,
                fireplacepart: 'fire',
                preservePosition: true,
                type: 'fireplace_fire'
            };
            
            this.scene.add(flame);
            this.objects.push(flame);
        });
        
        // Add fire light
        const fireLight = new this.THREE.PointLight(0xFF4500, 1, 30);
        fireLight.position.set(x, y + 2, z);
        
        fireLight.userData = {
            templateObject: true,
            christmasDecoration: true,
            fireplace: true,
            fireplacepart: 'light',
            type: 'fireplace_light'
        };
        
        this.scene.add(fireLight);
    }

    /**
     * Create fireplace mantle
     */
    createFireplaceMantle(fireplacePosition) {
        const mantleGeometry = new this.THREE.BoxGeometry(30, 2, 10);
        const mantleMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6,
        });
        
        const mantle = new this.THREE.Mesh(mantleGeometry, mantleMaterial);
        mantle.position.set(fireplacePosition.x, 18, fireplacePosition.z);
        
        mantle.userData = {
            templateObject: true,
            christmasDecoration: true,
            fireplace: true,
            fireplacepart: 'mantle',
            preservePosition: true,
            type: 'fireplace_mantle'
        };
        
        this.scene.add(mantle);
        this.objects.push(mantle);
    }

    /**
     * Create snowman in center of room
     */
    createSnowman() {
        console.log('⛄ Creating snowman...');
        
        const snowmanPosition = { x: 0, z: 20 }; // Center of room, towards front
        
        // Bottom snowball
        const bottomGeometry = new this.THREE.SphereGeometry(8, 12, 8);
        const snowMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFAFA, // Snow white
            roughness: 0.8,
        });
        
        const bottom = new this.THREE.Mesh(bottomGeometry, snowMaterial);
        bottom.position.set(snowmanPosition.x, 8, snowmanPosition.z);
        
        bottom.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'bottom',
            preservePosition: true,
            type: 'snowman_bottom'
        };
        
        this.scene.add(bottom);
        this.objects.push(bottom);
        
        // Middle snowball
        const middleGeometry = new this.THREE.SphereGeometry(6, 12, 8);
        const middle = new this.THREE.Mesh(middleGeometry, snowMaterial);
        middle.position.set(snowmanPosition.x, 20, snowmanPosition.z);
        
        middle.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'middle',
            preservePosition: true,
            type: 'snowman_middle'
        };
        
        this.scene.add(middle);
        this.objects.push(middle);
        
        // Head snowball
        const headGeometry = new this.THREE.SphereGeometry(4, 12, 8);
        const head = new this.THREE.Mesh(headGeometry, snowMaterial);
        head.position.set(snowmanPosition.x, 30, snowmanPosition.z);
        
        head.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'head',
            preservePosition: true,
            type: 'snowman_head'
        };
        
        this.scene.add(head);
        this.objects.push(head);
        
        // Add snowman features
        this.addSnowmanFeatures(snowmanPosition);
        
        console.log('⛄ Snowman created');
    }

    /**
     * Add features to snowman (carrot nose, coal eyes, stick arms)
     */
    addSnowmanFeatures(snowmanPosition) {
        // Carrot nose
        const noseGeometry = new this.THREE.ConeGeometry(0.5, 3, 6);
        const noseMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFF8C00, // Orange
        });
        
        const nose = new this.THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(snowmanPosition.x, 30, snowmanPosition.z + 4);
        nose.rotation.x = Math.PI / 2;
        
        nose.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'nose',
            preservePosition: true,
            type: 'snowman_nose'
        };
        
        this.scene.add(nose);
        this.objects.push(nose);
        
        // Coal eyes
        const eyeGeometry = new this.THREE.SphereGeometry(0.5, 6, 4);
        const eyeMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x000000, // Black
        });
        
        // Left eye
        const leftEye = new this.THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(snowmanPosition.x - 1.5, 31, snowmanPosition.z + 3.5);
        leftEye.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'eye_left',
            preservePosition: true,
            type: 'snowman_eye'
        };
        this.scene.add(leftEye);
        this.objects.push(leftEye);
        
        // Right eye
        const rightEye = new this.THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(snowmanPosition.x + 1.5, 31, snowmanPosition.z + 3.5);
        rightEye.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'eye_right',
            preservePosition: true,
            type: 'snowman_eye'
        };
        this.scene.add(rightEye);
        this.objects.push(rightEye);
        
        // Stick arms
        const armGeometry = new this.THREE.CylinderGeometry(0.2, 0.2, 8, 6);
        const armMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown
        });
        
        // Left arm
        const leftArm = new this.THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(snowmanPosition.x - 8, 20, snowmanPosition.z);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'arm_left',
            preservePosition: true,
            type: 'snowman_arm'
        };
        this.scene.add(leftArm);
        this.objects.push(leftArm);
        
        // Right arm
        const rightArm = new this.THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(snowmanPosition.x + 8, 20, snowmanPosition.z);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.userData = {
            templateObject: true,
            christmasDecoration: true,
            snowman: true,
            snowmanPart: 'arm_right',
            preservePosition: true,
            type: 'snowman_arm'
        };
        this.scene.add(rightArm);
        this.objects.push(rightArm);
    }

    /**
     * Create Santa's house in corner
     */
    createSantasHouse() {
        console.log('🏠 Creating Santa\'s house...');
        
        const housePosition = { x: 80, z: 80 }; // Front right corner
        
        // House base
        const baseGeometry = new this.THREE.BoxGeometry(20, 15, 20);
        const baseMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown wood
            roughness: 0.8,
        });
        
        const base = new this.THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(housePosition.x, 7.5, housePosition.z);
        
        base.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'base',
            preservePosition: true,
            type: 'santas_house_base'
        };
        
        this.scene.add(base);
        this.objects.push(base);
        
        // Snow-covered roof
        const roofGeometry = new this.THREE.ConeGeometry(16, 10, 4);
        const roofMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFAFA, // White snow
            roughness: 0.7,
        });
        
        const roof = new this.THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(housePosition.x, 20, housePosition.z);
        roof.rotation.y = Math.PI / 4; // Diamond shape
        
        roof.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'roof',
            preservePosition: true,
            type: 'santas_house_roof'
        };
        
        this.scene.add(roof);
        this.objects.push(roof);
        
        // Add house details
        this.addHouseDetails(housePosition);
        
        console.log('🏠 Santa\'s house created');
    }

    /**
     * Add details to Santa's house
     */
    addHouseDetails(housePosition) {
        // Door
        const doorGeometry = new this.THREE.BoxGeometry(4, 8, 0.5);
        const doorMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x654321, // Dark brown
        });
        
        const door = new this.THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(housePosition.x, 4, housePosition.z + 10);
        
        door.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'door',
            preservePosition: true,
            type: 'santas_house_door'
        };
        
        this.scene.add(door);
        this.objects.push(door);
        
        // Windows
        const windowGeometry = new this.THREE.BoxGeometry(3, 3, 0.3);
        const windowMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x87CEEB, // Light blue
            transparent: true,
            opacity: 0.8,
        });
        
        // Left window
        const leftWindow = new this.THREE.Mesh(windowGeometry, windowMaterial);
        leftWindow.position.set(housePosition.x - 8, 10, housePosition.z + 10);
        leftWindow.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'window',
            preservePosition: true,
            type: 'santas_house_window'
        };
        this.scene.add(leftWindow);
        this.objects.push(leftWindow);
        
        // Right window
        const rightWindow = new this.THREE.Mesh(windowGeometry, windowMaterial);
        rightWindow.position.set(housePosition.x + 8, 10, housePosition.z + 10);
        rightWindow.userData = {
            templateObject: true,
            christmasDecoration: true,
            santasHouse: true,
            housePart: 'window',
            preservePosition: true,
            type: 'santas_house_window'
        };
        this.scene.add(rightWindow);
        this.objects.push(rightWindow);
    }

    /**
     * Create North Pole next to Santa's house
     */
    createNorthPole() {
        console.log('🎯 Creating North Pole...');
        
        const polePosition = { x: 100, z: 60 }; // Next to Santa's house
        
        // Pole
        const poleGeometry = new this.THREE.CylinderGeometry(1, 1, 25, 8);
        const poleMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White
        });
        
        const pole = new this.THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(polePosition.x, 12.5, polePosition.z);
        
        pole.userData = {
            templateObject: true,
            christmasDecoration: true,
            northPole: true,
            polePart: 'pole',
            preservePosition: true,
            type: 'north_pole_pole'
        };
        
        this.scene.add(pole);
        this.objects.push(pole);
        
        // Red stripes
        for (let i = 0; i < 8; i++) {
            const stripeGeometry = new this.THREE.RingGeometry(1, 1.1, 8);
            const stripeMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFF0000, // Red
            });
            
            const stripe = new this.THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.set(polePosition.x, 2 + (i * 3), polePosition.z);
            stripe.rotation.x = Math.PI / 2;
            
            stripe.userData = {
                templateObject: true,
                christmasDecoration: true,
                northPole: true,
                polePart: 'stripe',
                preservePosition: true,
                type: 'north_pole_stripe'
            };
            
            this.scene.add(stripe);
            this.objects.push(stripe);
        }
        
        // Sign
        const signGeometry = new this.THREE.BoxGeometry(8, 4, 0.5);
        const signMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFFFF, // White
        });
        
        const sign = new this.THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(polePosition.x, 27, polePosition.z);
        
        sign.userData = {
            templateObject: true,
            christmasDecoration: true,
            northPole: true,
            polePart: 'sign',
            preservePosition: true,
            type: 'north_pole_sign'
        };
        
        this.scene.add(sign);
        this.objects.push(sign);
        
        console.log('🎯 North Pole created');
    }

    /**
     * Add Christmas lights throughout the scene
     */
    addChristmasLights() {
        console.log('💡 Adding Christmas lights...');
        
        // String lights around the room perimeter
        const lightPositions = [
            // Around ceiling perimeter
            { x: -100, y: 35, z: -100 }, { x: -50, y: 35, z: -100 }, { x: 0, y: 35, z: -100 }, { x: 50, y: 35, z: -100 }, { x: 100, y: 35, z: -100 },
            { x: 100, y: 35, z: -50 }, { x: 100, y: 35, z: 0 }, { x: 100, y: 35, z: 50 }, { x: 100, y: 35, z: 100 },
            { x: 50, y: 35, z: 100 }, { x: 0, y: 35, z: 100 }, { x: -50, y: 35, z: 100 }, { x: -100, y: 35, z: 100 },
            { x: -100, y: 35, z: 50 }, { x: -100, y: 35, z: 0 }, { x: -100, y: 35, z: -50 },
        ];

        const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF]; // Various colors
        
        lightPositions.forEach((pos, index) => {
            const lightGeometry = new this.THREE.SphereGeometry(0.8, 6, 4);
            const lightMaterial = new this.THREE.MeshStandardMaterial({
                color: colors[index % colors.length],
                emissive: colors[index % colors.length],
                emissiveIntensity: 0.5,
            });
            
            const light = new this.THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(pos.x, pos.y, pos.z);
            
            light.userData = {
                templateObject: true,
                christmasDecoration: true,
                christmasLights: true,
                preservePosition: true,
                type: 'christmas_light'
            };
            
            this.scene.add(light);
            this.objects.push(light);
        });
        
        console.log('💡 Christmas lights added');
    }

    /**
     * Add Christmas ambience
     */
    addChristmasAmbience() {
        console.log('✨ Adding Christmas ambience...');
        
        // Add some scattered gift boxes
        this.createGiftBoxes();
        
        // Add candy canes
        this.createCandyCanes();
        
        console.log('✨ Christmas ambience added');
    }

    /**
     * Create gift boxes scattered around
     */
    createGiftBoxes() {
        const giftPositions = [
            { x: -60, z: -60, color: 0xFF0000 }, // Red
            { x: 40, z: -40, color: 0x00FF00 }, // Green
            { x: -30, z: 40, color: 0x0000FF }, // Blue
            { x: 60, z: -20, color: 0xFFD700 }, // Gold
        ];

        giftPositions.forEach((gift, index) => {
            const size = 3 + Math.random() * 2;
            const boxGeometry = new this.THREE.BoxGeometry(size, size, size);
            const boxMaterial = new this.THREE.MeshStandardMaterial({
                color: gift.color,
                metalness: 0.3,
                roughness: 0.7,
            });
            
            const box = new this.THREE.Mesh(boxGeometry, boxMaterial);
            box.position.set(gift.x, size / 2, gift.z);
            
            box.userData = {
                templateObject: true,
                christmasDecoration: true,
                giftBox: true,
                preservePosition: true,
                type: 'christmas_gift'
            };
            
            this.scene.add(box);
            this.objects.push(box);
        });
    }

    /**
     * Create candy canes
     */
    createCandyCanes() {
        const candyCanePositions = [
            { x: -20, z: -90 },
            { x: 20, z: -90 },
            { x: 90, z: -20 },
            { x: 90, z: 20 },
        ];

        candyCanePositions.forEach((pos, index) => {
            // Candy cane shaft
            const shaftGeometry = new this.THREE.CylinderGeometry(1, 1, 12, 8);
            const shaftMaterial = new this.THREE.MeshStandardMaterial({
                color: index % 2 === 0 ? 0xFF0000 : 0xFFFFFF, // Red and white stripes
            });
            
            const shaft = new this.THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.position.set(pos.x, 6, pos.z);
            
            shaft.userData = {
                templateObject: true,
                christmasDecoration: true,
                candyCane: true,
                preservePosition: true,
                type: 'candy_cane'
            };
            
            this.scene.add(shaft);
            this.objects.push(shaft);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChristmasDecorations;
} else if (typeof window !== 'undefined') {
    window.ChristmasDecorations = ChristmasDecorations;
}