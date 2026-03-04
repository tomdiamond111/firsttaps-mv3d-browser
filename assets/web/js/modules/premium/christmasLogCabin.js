/**
 * Christmas Log Cabin Module
 * Handles the log cabin wall system for ChristmasLand world
 * Creates cozy wood walls with snow accents
 */

class ChristmasLogCabin {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
        
        console.log('🏠 Christmas log cabin system initialized');
    }

    /**
     * Create all log cabin walls
     */
    createLogCabinWalls() {
        console.log('🏠 Creating log cabin walls...');
        
        this.createWallStructure();
        this.addWallDetails();
        this.addSnowAccents();
        
        console.log('🏠 Log cabin walls complete');
    }

    /**
     * Create the main wall structure
     */
    createWallStructure() {
        const wallHeight = 60; // Raised from 40 to 60 (20 units higher)
        const wallLength = 300;
        const logHeight = 4;
        const numLogs = wallHeight / logHeight;
        
        // Create walls with log texture
        const walls = [
            // Back wall
            { x: 0, z: -150, width: wallLength, rotation: 0 },
            // Front wall (with door gap)
            { x: -75, z: 150, width: wallLength / 2, rotation: 0 },
            { x: 75, z: 150, width: wallLength / 2, rotation: 0 },
            // Left wall
            { x: -150, z: 0, width: wallLength, rotation: Math.PI / 2 },
            // Right wall
            { x: 150, z: 0, width: wallLength, rotation: Math.PI / 2 },
        ];

        walls.forEach((wall, wallIndex) => {
            this.createLogWall(wall, wallIndex, numLogs, logHeight);
        });
    }

    /**
     * Create a single log wall
     */
    createLogWall(wallConfig, wallIndex, numLogs, logHeight) {
        for (let logLayer = 0; logLayer < numLogs; logLayer++) {
            const y = logHeight / 2 + (logLayer * logHeight);
            
            // Alternate log lengths for authentic log cabin look
            const logLength = wallConfig.width - (logLayer % 2 === 0 ? 0 : 8);
            const xOffset = logLayer % 2 === 0 ? 0 : 4;
            
            const logGeometry = new this.THREE.CylinderGeometry(
                logHeight / 2, 
                logHeight / 2, 
                logLength, 
                8
            );
            
            const logMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x8B4513, // Brown wood
                roughness: 0.8,
                metalness: 0.1,
            });

            const log = new this.THREE.Mesh(logGeometry, logMaterial);
            log.position.set(
                wallConfig.x + xOffset, 
                y, 
                wallConfig.z
            );
            log.rotation.y = wallConfig.rotation;
            log.rotation.z = Math.PI / 2; // Logs lie horizontally
            
            log.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                wallId: wallIndex,
                logLayer: logLayer,
                preservePosition: true,
                type: 'log_cabin_log'
            };

            this.scene.add(log);
            this.objects.push(log);
        }
    }

    /**
     * Add details to the cabin walls
     */
    addWallDetails() {
        console.log('🏠 Adding wall details...');
        
        // Add corner supports
        this.createCornerSupports();
        
        // Add window frames
        this.createWindowFrames();
        
        // Add door frame
        this.createDoorFrame();
        
        console.log('🏠 Wall details added');
    }

    /**
     * Create corner support beams
     */
    createCornerSupports() {
        const corners = [
            { x: -150, z: -150 }, // Back left
            { x: 150, z: -150 },  // Back right
            { x: -150, z: 150 },  // Front left
            { x: 150, z: 150 },   // Front right
        ];

        corners.forEach((corner, index) => {
            const supportGeometry = new this.THREE.BoxGeometry(8, 60, 8); // Updated height from 40 to 60
            const supportMaterial = new this.THREE.MeshStandardMaterial({
                color: 0x654321, // Darker brown
                roughness: 0.9,
            });

            const support = new this.THREE.Mesh(supportGeometry, supportMaterial);
            support.position.set(corner.x, 30, corner.z); // Updated Y from 20 to 30 (60/2)
            
            support.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                cornerSupport: true,
                cornerId: index,
                preservePosition: true,
                type: 'log_cabin_corner'
            };

            this.scene.add(support);
            this.objects.push(support);
        });
    }

    /**
     * Create window frames
     */
    createWindowFrames() {
        const windows = [
            // Back wall windows
            { x: -40, y: 35, z: -150, width: 15, height: 12 }, // Raised Y from 25 to 35
            { x: 40, y: 35, z: -150, width: 15, height: 12 },  // Raised Y from 25 to 35
            
            // Side wall windows
            { x: -150, y: 35, z: -40, width: 15, height: 12, rotation: Math.PI / 2 }, // Raised Y from 25 to 35
            { x: 150, y: 35, z: -40, width: 15, height: 12, rotation: Math.PI / 2 },   // Raised Y from 25 to 35
            { x: -150, y: 35, z: 40, width: 15, height: 12, rotation: Math.PI / 2 },   // Raised Y from 25 to 35
            { x: 150, y: 35, z: 40, width: 15, height: 12, rotation: Math.PI / 2 },    // Raised Y from 25 to 35
        ];

        windows.forEach((window, index) => {
            this.createWindow(window, index);
        });
    }

    /**
     * Create a single window
     */
    createWindow(windowConfig, index) {
        // Window frame
        const frameGeometry = new this.THREE.BoxGeometry(
            windowConfig.width + 2, 
            windowConfig.height + 2, 
            2
        );
        const frameMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x654321, // Dark brown frame
            roughness: 0.8,
        });

        const frame = new this.THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(windowConfig.x, windowConfig.y, windowConfig.z);
        if (windowConfig.rotation) {
            frame.rotation.y = windowConfig.rotation;
        }
        
        frame.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            windowFrame: true,
            windowId: index,
            preservePosition: true,
            type: 'log_cabin_window_frame'
        };

        this.scene.add(frame);
        this.objects.push(frame);

        // Window glass
        const glassGeometry = new this.THREE.PlaneGeometry(
            windowConfig.width, 
            windowConfig.height
        );
        const glassMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x87CEEB, // Light blue tint
            transparent: true,
            opacity: 0.6,
            metalness: 0.9,
            roughness: 0.1,
        });

        const glass = new this.THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.set(windowConfig.x, windowConfig.y, windowConfig.z + 1);
        if (windowConfig.rotation) {
            glass.rotation.y = windowConfig.rotation;
        }
        
        glass.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            windowGlass: true,
            windowId: index,
            preservePosition: true,
            type: 'log_cabin_window_glass'
        };

        this.scene.add(glass);
        this.objects.push(glass);
    }

    /**
     * Create door frame for front entrance
     */
    createDoorFrame() {
        const doorConfig = {
            x: 0,
            y: 30, // Raised from 20 to 30 for taller door
            z: 150,
            width: 20,
            height: 55 // Increased from 35 to 55 for taller door
        };

        // Door frame
        const frameGeometry = new this.THREE.BoxGeometry(
            doorConfig.width + 4, 
            doorConfig.height + 2, 
            4
        );
        const frameMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x654321, // Dark brown
            roughness: 0.8,
        });

        const frame = new this.THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(doorConfig.x, doorConfig.y, doorConfig.z);
        
        frame.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            doorFrame: true,
            preservePosition: true,
            type: 'log_cabin_door_frame'
        };

        this.scene.add(frame);
        this.objects.push(frame);

        // Add door arch detail
        const archGeometry = new this.THREE.CylinderGeometry(
            doorConfig.width / 2, 
            doorConfig.width / 2, 
            4, 
            16, 
            1, 
            false, 
            0, 
            Math.PI
        );
        const arch = new this.THREE.Mesh(archGeometry, frameMaterial);
        arch.position.set(doorConfig.x, doorConfig.y + doorConfig.height / 2, doorConfig.z);
        arch.rotation.z = Math.PI / 2;
        
        arch.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            doorArch: true,
            preservePosition: true,
            type: 'log_cabin_door_arch'
        };

        this.scene.add(arch);
        this.objects.push(arch);
    }

    /**
     * Add snow accents to the cabin
     */
    addSnowAccents() {
        console.log('❄️ Adding snow accents...');
        
        // Snow on window sills
        this.addWindowSnow();
        
        // Snow on corner supports
        this.addCornerSnow();
        
        // Icicles hanging from roof line
        this.addIcicles();
        
        console.log('❄️ Snow accents added');
    }

    /**
     * Add snow to window sills
     */
    addWindowSnow() {
        const windowPositions = [
            { x: -40, z: -150 }, { x: 40, z: -150 },
            { x: -150, z: -40 }, { x: 150, z: -40 },
            { x: -150, z: 40 }, { x: 150, z: 40 },
        ];

        windowPositions.forEach((pos, index) => {
            const snowGeometry = new this.THREE.BoxGeometry(18, 2, 4);
            const snowMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFFFAFA, // Snow white
                roughness: 0.8,
            });

            const snow = new this.THREE.Mesh(snowGeometry, snowMaterial);
            snow.position.set(pos.x, 28, pos.z); // Raised from 18 to 28 to match higher windows
            
            snow.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                windowSnow: true,
                preservePosition: true,
                type: 'window_snow'
            };

            this.scene.add(snow);
            this.objects.push(snow);
        });
    }

    /**
     * Add snow to corner supports
     */
    addCornerSnow() {
        const corners = [
            { x: -150, z: -150 },
            { x: 150, z: -150 },
            { x: -150, z: 150 },
            { x: 150, z: 150 },
        ];

        corners.forEach((corner, index) => {
            const snowGeometry = new this.THREE.BoxGeometry(10, 3, 10);
            const snowMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xFFFAFA,
                roughness: 0.8,
            });

            const snow = new this.THREE.Mesh(snowGeometry, snowMaterial);
            snow.position.set(corner.x, 61.5, corner.z); // Raised from 41.5 to 61.5 for higher walls
            
            snow.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                cornerSnow: true,
                preservePosition: true,
                type: 'corner_snow'
            };

            this.scene.add(snow);
            this.objects.push(snow);
        });
    }

    /**
     * Add icicles hanging from the roof line
     */
    addIcicles() {
        const iciclePositions = [];
        
        // Generate icicle positions around the perimeter
        for (let i = -140; i <= 140; i += 20) {
            iciclePositions.push({ x: i, z: -150 }); // Back wall
            iciclePositions.push({ x: i, z: 150 });  // Front wall
            iciclePositions.push({ x: -150, z: i }); // Left wall
            iciclePositions.push({ x: 150, z: i });  // Right wall
        }

        iciclePositions.forEach((pos, index) => {
            const length = 3 + Math.random() * 4; // 3-7 units long
            const icicleGeometry = new this.THREE.ConeGeometry(0.3, length, 6);
            const icicleMaterial = new this.THREE.MeshStandardMaterial({
                color: 0xE6F3FF, // Icy blue-white
                transparent: true,
                opacity: 0.9,
                metalness: 0.1,
                roughness: 0.1,
            });

            const icicle = new this.THREE.Mesh(icicleGeometry, icicleMaterial);
            icicle.position.set(pos.x, 60 - length / 2, pos.z); // Updated from 40 to 60 for higher roof line
            
            icicle.userData = {
                templateObject: true,
                christmasDecoration: true,
                logCabinWall: true,
                icicle: true,
                preservePosition: true,
                type: 'icicle'
            };

            this.scene.add(icicle);
            this.objects.push(icicle);
        });
    }

    /**
     * Create cabin roof (optional - can be called separately)
     */
    createCabinRoof() {
        console.log('🏠 Creating cabin roof...');
        
        const roofGeometry = new this.THREE.ConeGeometry(200, 30, 4);
        const roofMaterial = new this.THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown wood
            roughness: 0.8,
        });

        const roof = new this.THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 75, 0); // Raised from 55 to 75 (60 + 15 for clearance)
        roof.rotation.y = Math.PI / 4; // Diamond orientation
        
        roof.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            cabinRoof: true,
            preservePosition: true,
            type: 'cabin_roof'
        };

        this.scene.add(roof);
        this.objects.push(roof);

        // Add snow on roof
        const snowRoofGeometry = new this.THREE.ConeGeometry(202, 8, 4);
        const snowRoofMaterial = new this.THREE.MeshStandardMaterial({
            color: 0xFFFAFA, // Snow white
            roughness: 0.8,
        });

        const snowRoof = new this.THREE.Mesh(snowRoofGeometry, snowRoofMaterial);
        snowRoof.position.set(0, 91, 0); // Raised from 71 to 91 (75 + 16 for snow layer)
        snowRoof.rotation.y = Math.PI / 4;
        
        snowRoof.userData = {
            templateObject: true,
            christmasDecoration: true,
            logCabinWall: true,
            roofSnow: true,
            preservePosition: true,
            type: 'roof_snow'
        };

        this.scene.add(snowRoof);
        this.objects.push(snowRoof);
        
        console.log('🏠 Cabin roof created');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChristmasLogCabin;
} else if (typeof window !== 'undefined') {
    window.ChristmasLogCabin = ChristmasLogCabin;
}