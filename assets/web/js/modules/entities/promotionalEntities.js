// modules/entities/promotionalEntities.js
// Promotional advertising entities for FirstTaps Premium
// These entities appear independently of the gaming system and promote subscriptions
// Dependencies: THREE (global), BaseInteractiveEntity pattern from gaming entities

(function() {
    'use strict';
    
    console.log('📢 Loading Promotional Entities module...');
    
    /**
     * BASE PROMOTIONAL ENTITY
     * Shared behavior for all promotional entities
     */
    class BasePromotionalEntity {
        constructor(scene, config = {}) {
            this.scene = scene;
            this.group = new THREE.Group();
            this.moveSpeed = config.moveSpeed || 0.04;
            this.direction = new THREE.Vector3(1, 0, 0);
            this.startTime = Date.now();
            this.lifetime = config.lifetime || 30000; // 30 seconds default
            this.isPromotional = true; // Flag to identify promotional entities
            this.promotionalMessage = config.message || 'GO PREMIUM!';
            
            // Add to scene
            this.scene.add(this.group);
        }
        
        /**
         * Create promotional banner texture with gradient and text
         */
        createPromotionalBannerTexture(text) {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Vibrant gradient background
            const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
            gradient.addColorStop(0, '#FF6B35');
            gradient.addColorStop(0.5, '#F7931E');
            gradient.addColorStop(1, '#FF6B35');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 12;
            ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
            
            // Text
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            
            // Large single text line
            ctx.font = 'bold 96px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
            
            return new THREE.CanvasTexture(canvas);
        }
        
        /**
         * Update entity position and check for removal
         */
        update() {
            const movement = this.direction.clone().multiplyScalar(this.moveSpeed);
            this.group.position.add(movement);
            
            // Check if entity should be removed
            return this.shouldBeRemoved();
        }
        
        /**
         * Check if entity should be removed (lifetime or out of bounds)
         */
        shouldBeRemoved() {
            const age = Date.now() - this.startTime;
            if (age > this.lifetime) return true;
            
            const pos = this.group.position;
            return Math.abs(pos.x) > 100 || Math.abs(pos.z) > 100;
        }
        
        /**
         * Clean up entity
         */
        dispose() {
            this.scene.remove(this.group);
            
            this.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
    }
    
    /**
     * RED BIPLANE WITH TRAILING BANNER
     * Classic advertising airplane with vintage feel
     */
    class RedBiplaneEntity extends BasePromotionalEntity {
        constructor(scene) {
            super(scene, {
                moveSpeed: 0.08,
                lifetime: 30000,
                message: '🎵 GO PREMIUM!'
            });
            
            this.createBiplane();
            this.setRandomSkyPosition();
            this.setRandomDirection();
        }
        
        createBiplane() {
            this.group.name = 'RedBiplaneEntity';
            
            // Fuselage (main body)
            const fuselageGeometry = new THREE.CylinderGeometry(0.5, 0.4, 5, 12);
            const fuselageMaterial = new THREE.MeshLambertMaterial({ color: 0xDC143C }); // Red
            const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
            fuselage.rotation.z = Math.PI / 2;
            this.group.add(fuselage);
            
            // Upper wing
            const upperWingGeometry = new THREE.BoxGeometry(7, 0.15, 1.8);
            const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xB22222 });
            const upperWing = new THREE.Mesh(upperWingGeometry, wingMaterial);
            upperWing.position.y = 0.8;
            this.group.add(upperWing);
            
            // Lower wing
            const lowerWing = new THREE.Mesh(upperWingGeometry, wingMaterial);
            lowerWing.position.y = -0.8;
            this.group.add(lowerWing);
            
            // Wing struts
            const strutGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6);
            const strutMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            
            for (let x of [-2, 0, 2]) {
                const strut = new THREE.Mesh(strutGeometry, strutMaterial);
                strut.position.set(x, 0, 0);
                this.group.add(strut);
            }
            
            // Tail
            const tailGeometry = new THREE.BoxGeometry(0.2, 1.8, 1.2);
            const tail = new THREE.Mesh(tailGeometry, wingMaterial);
            tail.position.set(-2.3, 0.4, 0);
            this.group.add(tail);
            
            // Propeller
            const propellerGeometry = new THREE.BoxGeometry(0.1, 3.5, 0.1);
            const propellerMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
            this.propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
            this.propeller.position.set(2.7, 0, 0);
            this.group.add(this.propeller);
            
            // Trailing banner
            this.addTrailingBanner();
        }
        
        addTrailingBanner() {
            // Banner rope
            const ropeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 12, 6);
            const ropeMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });
            const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
            rope.position.set(-8, 0, 0);
            rope.rotation.z = Math.PI / 2;
            this.group.add(rope);
            
            // Create promotional banner texture with short, clear message
            const bannerTexture = this.createPromotionalBannerTexture('Tap for Premium!');
            
            // Banner fabric - LARGER and more visible
            const bannerGeometry = new THREE.PlaneGeometry(18, 4);
            const bannerMaterial = new THREE.MeshBasicMaterial({ 
                map: bannerTexture,
                side: THREE.DoubleSide,
                transparent: false
            });
            const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
            banner.position.set(-16, 0, 0);
            
            // Mark banner as clickable promotional element
            banner.userData.isPromotionalBanner = true;
            banner.userData.clickable = true;
            
            this.group.add(banner);
            this.clickableBanner = banner; // Store reference for easy access
            
            // Banner support poles - adjusted for larger banner
            const poleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 4, 6);
            const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            
            const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
            leftPole.position.set(-25, 0, 0);
            this.group.add(leftPole);
            
            const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
            rightPole.position.set(-7, 0, 0);
            this.group.add(rightPole);
        }
        
        setRandomSkyPosition() {
            const side = Math.random() < 0.5 ? -1 : 1;
            this.group.position.set(
                side * 70,
                20 + Math.random() * 15,
                Math.random() * 40 - 20
            );
        }
        
        setRandomDirection() {
            const targetX = this.group.position.x > 0 ? -140 : 140;
            this.direction.set(targetX - this.group.position.x, 0, 0);
            this.direction.normalize();
            
            // Face direction
            this.group.lookAt(
                this.group.position.x + this.direction.x * 10,
                this.group.position.y,
                this.group.position.z
            );
        }
        
        update() {
            // Spin propeller
            if (this.propeller) {
                this.propeller.rotation.x += 0.3;
            }
            
            return super.update();
        }
    }
    
    /**
     * COLORFUL HOT AIR BALLOON WITH SIGN
     * Peaceful floating balloon with large banner on envelope
     */
    class HotAirBalloonEntity extends BasePromotionalEntity {
        constructor(scene) {
            super(scene, {
                moveSpeed: 0.02,
                lifetime: 40000, // Slower, stays longer
                message: 'FIRSTTAPS PREMIUM'
            });
            
            this.createBalloon();
            this.setRandomSkyPosition();
            this.bobPhase = Math.random() * Math.PI * 2; // For gentle bobbing
        }
        
        createBalloon() {
            this.group.name = 'HotAirBalloonEntity';
            
            // Balloon envelope (colorful stripes)
            const balloonGeometry = new THREE.SphereGeometry(3, 16, 16);
            
            // Create vertical color stripes
            const colors = [0xFF6B35, 0xF7931E, 0xFECA57, 0xEE5A6F, 0xC44569];
            const stripeCount = colors.length;
            
            for (let i = 0; i < stripeCount; i++) {
                const stripeGeometry = new THREE.SphereGeometry(3.01, 16, 16, 
                    (i / stripeCount) * Math.PI * 2, 
                    (1 / stripeCount) * Math.PI * 2
                );
                const stripeMaterial = new THREE.MeshLambertMaterial({ 
                    color: colors[i] 
                });
                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                this.group.add(stripe);
            }
            
            // Basket
            const basketGeometry = new THREE.CylinderGeometry(0.8, 1, 1.5, 12);
            const basketMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const basket = new THREE.Mesh(basketGeometry, basketMaterial);
            basket.position.y = -4;
            this.group.add(basket);
            
            // Ropes connecting balloon to basket
            const ropeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 3, 6);
            const ropeMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });
            
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
                const x = Math.cos(angle) * 1.5;
                const z = Math.sin(angle) * 1.5;
                rope.position.set(x, -1.5, z);
                rope.rotation.set(Math.atan2(x, 3), 0, Math.atan2(z, 3));
                this.group.add(rope);
            }
            
            // Large banner on balloon side
            this.addBalloonBanner();
        }
        
        addBalloonBanner() {
            // Create promotional banner texture with short, clear message
            const bannerTexture = this.createPromotionalBannerTexture('Tap for Premium!');
            
            // Curved banner wrapped on balloon - LARGER and more visible
            const bannerGeometry = new THREE.PlaneGeometry(12, 3.5);
            const bannerMaterial = new THREE.MeshBasicMaterial({ 
                map: bannerTexture,
                side: THREE.DoubleSide,
                transparent: false
            });
            const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
            banner.position.set(0, 0.5, 3.2);
            
            // Mark banner as clickable promotional element
            banner.userData.isPromotionalBanner = true;
            banner.userData.clickable = true;
            
            this.group.add(banner);
            this.clickableBanner = banner; // Store reference for easy access
        }
        
        setRandomSkyPosition() {
            this.group.position.set(
                (Math.random() - 0.5) * 80,
                25 + Math.random() * 10,
                -60 + Math.random() * 20
            );
        }
        
        update() {
            // Gentle bobbing motion
            this.bobPhase += 0.02;
            this.group.position.y += Math.sin(this.bobPhase) * 0.02;
            
            // Slow forward drift
            this.group.position.z += this.moveSpeed;
            
            return this.shouldBeRemoved();
        }
        
        shouldBeRemoved() {
            const age = Date.now() - this.startTime;
            if (age > this.lifetime) return true;
            
            // Remove when it drifts too far forward
            return this.group.position.z > 80;
        }
    }
    
    /**
     * RED DOUBLE-DECKER BUS WITH SIDE ADVERTISING
     * London-style bus rolling through the scene
     */
    class DoubleDeckrBusEntity extends BasePromotionalEntity {
        constructor(scene) {
            super(scene, {
                moveSpeed: 0.06,
                lifetime: 35000,
                message: 'RIDE PREMIUM'
            });
            
            this.createBus();
            this.setRandomGroundPosition();
        }
        
        createBus() {
            this.group.name = 'DoubleDeckrBusEntity';
            
            // Lower deck
            const lowerDeckGeometry = new THREE.BoxGeometry(8, 2.5, 3);
            const busMaterial = new THREE.MeshLambertMaterial({ color: 0xDC143C }); // Red
            const lowerDeck = new THREE.Mesh(lowerDeckGeometry, busMaterial);
            lowerDeck.position.y = 1.8;
            this.group.add(lowerDeck);
            
            // Upper deck
            const upperDeckGeometry = new THREE.BoxGeometry(7.5, 2, 2.8);
            const upperDeck = new THREE.Mesh(upperDeckGeometry, busMaterial);
            upperDeck.position.y = 3.8;
            this.group.add(upperDeck);
            
            // Front windshield
            const windshieldGeometry = new THREE.BoxGeometry(3, 0.8, 0.1);
            const windshieldMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x87CEEB,
                transparent: true,
                opacity: 0.6
            });
            const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
            windshield.position.set(0, 2.2, 1.6);
            this.group.add(windshield);
            
            // Wheels
            const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
            const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            
            const wheelPositions = [
                [-2.5, 0.6, 1.8], [2.5, 0.6, 1.8],
                [-2.5, 0.6, -1.8], [2.5, 0.6, -1.8]
            ];
            
            this.wheels = [];
            wheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(...pos);
                this.group.add(wheel);
                this.wheels.push(wheel);
            });
            
            // Side advertising panels
            this.addSideAdvertising();
        }
        
        addSideAdvertising() {
            // Create promotional banner texture with short, clear message
            const bannerTexture = this.createPromotionalBannerTexture('Tap for Premium!');
            
            // Left side panel - LARGER and more visible
            const leftPanelGeometry = new THREE.PlaneGeometry(9, 3);
            const leftPanelMaterial = new THREE.MeshBasicMaterial({ 
                map: bannerTexture,
                side: THREE.FrontSide
            });
            const leftPanel = new THREE.Mesh(leftPanelGeometry, leftPanelMaterial);
            leftPanel.position.set(0, 2.8, 1.6);
            
            // Mark panel as clickable promotional element
            leftPanel.userData.isPromotionalBanner = true;
            leftPanel.userData.clickable = true;
            
            this.group.add(leftPanel);
            
            // Right side panel - LARGER and more visible
            const rightPanelGeometry = new THREE.PlaneGeometry(9, 3);
            const rightPanelMaterial = new THREE.MeshBasicMaterial({ 
                map: bannerTexture,
                side: THREE.FrontSide
            });
            const rightPanel = new THREE.Mesh(rightPanelGeometry, rightPanelMaterial);
            rightPanel.position.set(0, 2.8, -1.6);
            rightPanel.rotation.y = Math.PI;
            
            // Mark panel as clickable promotional element
            rightPanel.userData.isPromotionalBanner = true;
            rightPanel.userData.clickable = true;
            
            this.group.add(rightPanel);
            
            // Store references for easy access
            this.clickableBanners = [leftPanel, rightPanel];
        }
        
        setRandomGroundPosition() {
            // Start from one side, roll across
            const side = Math.random() < 0.5 ? -1 : 1;
            this.group.position.set(
                side * 80,
                0,
                -30 + Math.random() * 60
            );
            
            // Face direction
            this.direction.set(-side, 0, 0);
            if (side < 0) {
                this.group.rotation.y = Math.PI;
            }
        }
        
        update() {
            // Rotate wheels
            this.wheels.forEach(wheel => {
                wheel.rotation.x += this.moveSpeed * 2;
            });
            
            return super.update();
        }
    }
    
    // Export to global scope
    window.RedBiplaneEntity = RedBiplaneEntity;
    window.HotAirBalloonEntity = HotAirBalloonEntity;
    window.DoubleDeckrBusEntity = DoubleDeckrBusEntity;
    
    console.log('✅ Promotional Entities loaded: RedBiplane, HotAirBalloon, DoubleDeckrBus');
    
})();
