/**
 * Contact Info Screen Module (MV3D)
 * Displays contact information with native app action buttons
 * Replaces SMS screen for media-focused FirstTaps MV3D
 */

window.ContactInfoScreenClass = class ContactInfoScreen {
    constructor(contactData, scene) {
        this.contactData = contactData;
        this.scene = scene;
        this.isVisible = false;
        
        // Screen properties - same size as SMS screen for consistency
        this.screenWidth = 9;
        this.screenHeight = 12;
        this.canvasWidth = 900;
        this.canvasHeight = 1200;
        
        // UI state for button interactions
        this.hoveredButton = null;
        this.buttons = [];
        
        this.createScreen();
        this.setupInputHandling();
        
        console.log(`👤 Contact Info Screen initialized for ${this.contactData.name}`);
    }
    
    /**
     * Create the 3D screen mesh with canvas texture
     */
    createScreen() {
        // Create canvas for rendering contact info
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.ctx = this.canvas.getContext('2d');
        
        // Create screen geometry
        const geometry = new THREE.PlaneGeometry(this.screenWidth, this.screenHeight);
        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.minFilter = THREE.LinearFilter;
        
        // Create material
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.visible = false;
        
        // Add user data for interaction
        this.mesh.userData.isContactInfoScreen = true;
        this.mesh.userData.contactInfoScreen = this;
        this.mesh.userData.isInteractive = true;
        this.mesh.userData.type = 'contactInfoScreen'; // Ensure proper type for raycasting
        this.mesh.raycast = THREE.Mesh.prototype.raycast; // Explicitly enable raycasting
        
        // Create invisible interaction overlay - larger and more reliable for touch
        const overlayGeometry = new THREE.PlaneGeometry(this.screenWidth * 1.2, this.screenHeight * 1.2);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.0, // Completely invisible
            side: THREE.DoubleSide
        });
        
        this.interactionOverlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        this.interactionOverlay.userData = {
            type: 'contactInfoScreen',
            isContactInfoScreen: true,
            isInteractionOverlay: true,
            contactId: this.contactData.id,
            contactName: this.contactData.name,
            fileName: this.contactData.name || this.contactData.fileName || this.contactData.id,
            contactInfoScreen: this,
            parentContact: this.contactData,
            isInteractable: true
        };
        
        // Position overlay slightly in front of the screen
        this.interactionOverlay.position.z = 0.01;
        
        // Initially hidden
        this.interactionOverlay.visible = false;
        this.scene.add(this.interactionOverlay);
        
        // Render initial content
        this.render();
        
        console.log('👤 Contact info screen mesh created with interaction overlay');
    }
    
    /**
     * Define interactive button areas
     */
    defineButtons() {
        this.buttons = [
            {
                id: 'send_sms',
                label: '📱 Send SMS Message',
                x: 100,
                y: 300,
                width: 700,
                height: 120,
                action: () => this.openNativeSMS()
            },
            {
                id: 'open_dialer',
                label: '☎️ Call Contact',
                x: 100,
                y: 450,
                width: 700,
                height: 120,
                action: () => this.openNativeDialer()
            },
            {
                id: 'close',
                label: '✕ Close',
                x: 100,
                y: 600,
                width: 700,
                height: 120,
                action: () => this.hide()
            }
        ];
    }
    
    /**
     * Render contact information on canvas
     */
    render() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#34495e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Header bar
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(0, 0, this.canvasWidth, 100);
        
        // Header text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Contact Information', this.canvasWidth / 2, 65);
        
        // Avatar section (if available)
        let currentY = 180;
        if (this.contactData.avatar) {
            // Avatar placeholder circle
            ctx.fillStyle = '#4A90E2';
            ctx.beginPath();
            ctx.arc(this.canvasWidth / 2, currentY + 80, 80, 0, Math.PI * 2);
            ctx.fill();
            
            // Try to load and draw avatar image
            if (!this.avatarImage && this.contactData.avatar) {
                this.avatarImage = new Image();
                this.avatarImage.onload = () => {
                    this.render(); // Re-render when avatar loads
                };
                this.avatarImage.src = this.contactData.avatar;
            }
            
            if (this.avatarImage && this.avatarImage.complete) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(this.canvasWidth / 2, currentY + 80, 80, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(
                    this.avatarImage,
                    this.canvasWidth / 2 - 80,
                    currentY,
                    160,
                    160
                );
                ctx.restore();
            }
            
            currentY += 200;
        }
        
        // Contact name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.contactData.name || 'Unknown', this.canvasWidth / 2, currentY);
        currentY += 80;
        
        // Phone number
        ctx.fillStyle = '#95a5a6';
        ctx.font = '42px Arial';
        const phoneNumber = this.contactData.phoneNumber || 'No Phone';
        ctx.fillText(phoneNumber, this.canvasWidth / 2, currentY);
        currentY += 120;
        
        // Define and render buttons
        this.defineButtons();
        this.renderButtons();
        
        // Update texture
        this.texture.needsUpdate = true;
    }
    
    /**
     * Render interactive buttons
     */
    renderButtons() {
        const ctx = this.ctx;
        
        this.buttons.forEach(button => {
            const isHovered = this.hoveredButton === button.id;
            
            // Button background
            ctx.fillStyle = isHovered ? '#3498db' : '#34495e';
            ctx.fillRect(button.x, button.y, button.width, button.height);
            
            // Button border
            ctx.strokeStyle = isHovered ? '#2980b9' : '#2c3e50';
            ctx.lineWidth = 3;
            ctx.strokeRect(button.x, button.y, button.width, button.height);
            
            // Button text
            ctx.fillStyle = '#ffffff';
            ctx.font = isHovered ? 'bold 44px Arial' : 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                button.label,
                button.x + button.width / 2,
                button.y + button.height / 2 + 15
            );
        });
    }
    
    /**
     * Setup input handling for button clicks
     */
    setupInputHandling() {
        // Button interactions will be handled by the main interaction system
        // This is a placeholder for any future custom input handling
    }
    
    /**
     * Handle button click at canvas coordinates
     */
    handleClick(canvasX, canvasY) {
        for (const button of this.buttons) {
            if (canvasX >= button.x && canvasX <= button.x + button.width &&
                canvasY >= button.y && canvasY <= button.y + button.height) {
                console.log(`👤 Button clicked: ${button.id}`);
                button.action();
                return true;
            }
        }
        return false;
    }
    
    /**
     * Open native SMS app with this contact
     */
    openNativeSMS() {
        console.log(`📱 Opening native SMS for ${this.contactData.name}: ${this.contactData.phoneNumber}`);
        
        // Use SMSBridge to open SMS app (avoids WebView reload)
        if (window.SMSBridge && window.SMSBridge.openSMS) {
            const contactData = {
                phoneNumber: this.contactData.phoneNumber,
                contactName: this.contactData.name,
                contactId: this.contactData.id
            };
            
            window.SMSBridge.openSMS(contactData);
            console.log('📱 ✅ SMS app opened via SMSBridge');
        } else {
            console.error('⚠️ SMSBridge not available - cannot open SMS app');
            console.error('❌ Refusing to use window.location.href (would reload WebView)');
        }
    }
    
    /**
     * Open native dialer with this contact
     */
    openNativeDialer() {
        console.log(`☎️ Opening native dialer for ${this.contactData.name}: ${this.contactData.phoneNumber}`);
        
        // Use ContactDialerBridge to open dialer (avoids WebView reload)
        if (window.ContactDialerBridge && window.ContactDialerBridge.dialContact) {
            const contactData = {
                phoneNumber: this.contactData.phoneNumber,
                contactName: this.contactData.name,
                contactId: this.contactData.id
            };
            
            window.ContactDialerBridge.dialContact(contactData);
            console.log('☎️ ✅ Native dialer opened via ContactDialerBridge');
        } else {
            console.error('⚠️ ContactDialerBridge not available - cannot open dialer');
            console.error('❌ Refusing to use window.location.href (would reload WebView)');
        }
    }
    
    /**
     * Show the contact info screen
     */
    show() {
        this.isVisible = true;
        this.mesh.visible = true;
        if (this.interactionOverlay) {
            this.interactionOverlay.visible = true;
        }
        this.render();
        console.log(`👤 Contact info screen shown for ${this.contactData.name}`);
    }
    
    /**
     * Hide the contact info screen
     */
    hide() {
        this.isVisible = false;
        this.mesh.visible = false;
        if (this.interactionOverlay) {
            this.interactionOverlay.visible = false;
        }
        console.log(`👤 Contact info screen hidden for ${this.contactData.name}`);
    }
    
    /**
     * Toggle visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Get the mesh for this screen
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Update screen position to follow contact object
     */
    updatePosition(contactMesh) {
        if (!this.mesh || !contactMesh) return;
        
        // CRITICAL: Position screen TOWARDS CAMERA (negative Z) so raycaster hits screen BEFORE contact
        // Camera is typically at positive Z looking towards origin, so negative offset moves screen closer to camera
        const offset = new THREE.Vector3(0, 8, -3);
        this.mesh.position.copy(contactMesh.position).add(offset);
        
        // Position interaction overlay at same location, slightly in front
        if (this.interactionOverlay) {
            this.interactionOverlay.position.copy(this.mesh.position);
            this.interactionOverlay.position.z += 0.01; // Slightly closer to camera than screen
        }
        
        // Make screen face the camera
        if (window.app && window.app.camera) {
            this.mesh.lookAt(window.app.camera.position);
            if (this.interactionOverlay) {
                this.interactionOverlay.lookAt(window.app.camera.position);
            }
        }
    }
    
    /**
     * Cleanup when screen is destroyed
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.texture.dispose();
        }
        
        console.log(`👤 Contact info screen disposed for ${this.contactData.name}`);
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ContactInfoScreenClass;
}
