/**
 * Contact Notification Ring
 * 
 * Creates and manages visual notification rings around contact objects
 * to indicate unread SMS messages. Uses THREE.js for 3D rendering.
 * 
 * Features:
 * - Subtle pulsing blue ring at contact base
 * - Efficient geometry reuse
 * - Automatic cleanup
 * - Performance optimized
 */

class ContactNotificationRing {
    constructor() {
        this.debugMode = false;
        this.isInitialized = false;
        
        // Ring configuration
        this.ringConfig = {
            color: 0x00BFFF,        // Bright cyan-blue (glowing effect)
            innerRadius: 1.2,       // Larger inner radius
            outerRadius: 1.8,       // Thicker ring for visibility
            segments: 64,           // Smoother circle
            pulseSpeed: 0.004,      // Faster pulse for attention
            minOpacity: 0.5,        // Higher minimum opacity
            maxOpacity: 1.0,        // Full brightness at peak
            verticalOffset: -0.8    // Lower position, closer to ground
        };
        
        // Ring management
        this.activeRings = new Map(); // contactId -> ringData
        this.sharedGeometry = null;   // Reused ring geometry
        this.sharedMaterial = null;   // Reused ring material
        
        // Animation management
        this.animationFrame = null;
        this.lastFrameTime = 0;
        
        // Performance tracking
        this.ringStats = {
            ringsCreated: 0,
            ringsDestroyed: 0,
            animationFrames: 0,
            lastActivity: null
        };
        
        console.log('💍 ContactNotificationRing: Initializing visual alert system...');
        this.initialize();
    }

    /**
     * Initialize the notification ring system
     */
    initialize() {
        try {
            // ⚠️ CHECK FEATURE FLAG FIRST
            if (window.SMS_FEATURE_FLAGS && !window.SMS_FEATURE_FLAGS.ENABLE_SMS_ALERTS) {
                console.log('💍 ⚠️ ContactNotificationRing: DISABLED by feature flag');
                this.isInitialized = false;
                return;
            }
            
            // Create shared geometry and material for performance
            this.createSharedAssets();
            
            // Start animation loop
            this.startAnimationLoop();
            
            this.isInitialized = true;
            console.log('💍 ✅ ContactNotificationRing: Initialization complete');
            
            // Global access
            window.contactNotificationRing = this;
            
        } catch (error) {
            console.error('💍 ❌ ContactNotificationRing initialization failed:', error);
        }
    }

    /**
     * Create shared THREE.js assets for performance
     */
    createSharedAssets() {
        try {
            // Create ring geometry (reused for all rings)
            this.sharedGeometry = new THREE.RingGeometry(
                this.ringConfig.innerRadius,
                this.ringConfig.outerRadius,
                this.ringConfig.segments
            );

            // Create ring material (reused for all rings)
            this.sharedMaterial = new THREE.MeshBasicMaterial({
                color: this.ringConfig.color,
                transparent: true,
                opacity: this.ringConfig.maxOpacity,
                side: THREE.DoubleSide,
                depthWrite: false,
                depthTest: false,      // Render on top of everything
                blending: THREE.AdditiveBlending  // Additive blending for glow effect
            });

            // Rotate geometry to lie flat (horizontal)
            this.sharedGeometry.rotateX(-Math.PI / 2);
            
            if (this.debugMode) {
                console.log('💍 Shared ring assets created');
            }
            
        } catch (error) {
            console.error('💍 Error creating shared assets:', error);
        }
    }

    /**
     * Start the animation loop for pulsing rings
     */
    startAnimationLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        const animate = (currentTime) => {
            this.animateRings(currentTime);
            this.animationFrame = requestAnimationFrame(animate);
        };

        this.animationFrame = requestAnimationFrame(animate);
        
        if (this.debugMode) {
            console.log('💍 Animation loop started');
        }
    }

    /**
     * Animate all active rings (pulsing effect)
     */
    animateRings(currentTime) {
        if (this.activeRings.size === 0) return;

        this.ringStats.animationFrames++;
        
        // Calculate pulse value (sine wave for smooth pulsing)
        const pulseValue = (Math.sin(currentTime * this.ringConfig.pulseSpeed) + 1) / 2;
        const targetOpacity = this.ringConfig.minOpacity + 
                            (this.ringConfig.maxOpacity - this.ringConfig.minOpacity) * pulseValue;

        // Update all ring opacities
        this.activeRings.forEach((ringData, contactId) => {
            if (ringData.mesh && ringData.mesh.material) {
                ringData.mesh.material.opacity = targetOpacity;
            }
        });
    }

    /**
     * Show alert ring for a contact
     */
    showAlert(contactId) {
        try {
            if (!contactId) {
                console.warn(`💍 showAlert called with empty contactId`);
                return;
            }

            console.log(`💍 🔔 Starting showAlert for contact: ${contactId}`);

            // Check if ring already exists
            if (this.activeRings.has(contactId)) {
                console.log(`💍 Ring already exists for contact ${contactId} - ensuring visibility`);
                const existingRing = this.activeRings.get(contactId);
                if (existingRing?.mesh) {
                    existingRing.mesh.visible = true;
                    console.log(`💍 ✅ Made existing ring visible for contact ${contactId}`);
                }
                return;
            }

            // Find the contact object
            console.log(`💍 🔍 Searching for contact object: ${contactId}`);
            const contact = this.findContactObject(contactId);
            if (!contact) {
                console.warn(`💍 ❌ Contact object not found for ${contactId}`);
                
                // Debug: List available contact objects
                this.debugAvailableContacts();
                return;
            }

            console.log(`💍 ✅ Found contact object for ${contactId}:`, contact);

            // Create ring mesh
            const ringMesh = this.createRingMesh();
            if (!ringMesh) {
                console.error(`💍 ❌ Failed to create ring mesh for ${contactId}`);
                return;
            }

            // Position ring at contact base
            ringMesh.position.set(0, this.ringConfig.verticalOffset, 0);
            
            // Add ring as child of contact object
            contact.add(ringMesh);

            // Store ring data
            const ringData = {
                mesh: ringMesh,
                contact: contact,
                contactId: contactId,
                created: Date.now()
            };

            this.activeRings.set(contactId, ringData);
            this.ringStats.ringsCreated++;
            this.ringStats.lastActivity = Date.now();

            console.log(`💍 🔔 ✅ Alert ring created and attached for contact ${contactId}`);
            
        } catch (error) {
            console.error('💍 Error showing alert ring:', error);
        }
    }

    /**
     * Debug: List available contact objects to help troubleshoot
     */
    debugAvailableContacts() {
        try {
            console.log(`💍 🔍 DEBUG: Available contact objects:`);
            
            // Check ContactManager
            if (window.app?.contactManager) {
                console.log(`💍 🔍 ContactManager available, checking contacts...`);
                if (window.app.contactManager.contacts) {
                    const contactIds = Object.keys(window.app.contactManager.contacts);
                    console.log(`💍 🔍 ContactManager has ${contactIds.length} contacts:`, contactIds);
                } else {
                    console.log(`💍 🔍 ContactManager.contacts is empty or undefined`);
                }
            } else {
                console.log(`💍 🔍 ContactManager not available`);
            }
            
            // Check global contacts
            if (window.contacts) {
                const contactIds = Object.keys(window.contacts);
                console.log(`💍 🔍 Global window.contacts has ${contactIds.length} contacts:`, contactIds);
            } else {
                console.log(`💍 🔍 Global window.contacts not available`);
            }
            
            // Search scene for contact objects
            if (window.app?.scene) {
                const contactObjects = [];
                this.findAllContactsInScene(window.app.scene, contactObjects);
                console.log(`💍 🔍 Found ${contactObjects.length} contact objects in scene:`, 
                    contactObjects.map(obj => obj.userData?.contactId || 'unknown'));
            } else {
                console.log(`💍 🔍 Scene not available`);
            }
            
        } catch (error) {
            console.error('💍 Error debugging available contacts:', error);
        }
    }

    /**
     * Recursively find all contact objects in scene
     */
    findAllContactsInScene(object, contactObjects) {
        try {
            // Check if this object is a contact
            if (object.userData?.contactId) {
                contactObjects.push(object);
            }

            // Check children recursively
            for (const child of object.children) {
                this.findAllContactsInScene(child, contactObjects);
            }
            
        } catch (error) {
            console.error('💍 Error finding contacts in scene:', error);
        }
    }

    /**
     * Hide alert ring for a contact
     */
    hideAlert(contactId) {
        try {
            if (!contactId) return;

            const ringData = this.activeRings.get(contactId);
            if (!ringData) {
                if (this.debugMode) {
                    console.log(`💍 No ring to hide for contact ${contactId}`);
                }
                return;
            }

            // Remove ring from scene
            if (ringData.mesh && ringData.contact) {
                ringData.contact.remove(ringData.mesh);
            }

            // Dispose of mesh resources (material is shared, so don't dispose)
            if (ringData.mesh) {
                // Geometry is shared, so don't dispose
                ringData.mesh = null;
            }

            // Remove from active rings
            this.activeRings.delete(contactId);
            this.ringStats.ringsDestroyed++;
            this.ringStats.lastActivity = Date.now();

            console.log(`💍 ✅ Alert ring hidden for contact ${contactId}`);
            
        } catch (error) {
            console.error('💍 Error hiding alert ring:', error);
        }
    }

    /**
     * Create a new ring mesh
     */
    createRingMesh() {
        try {
            if (!this.sharedGeometry || !this.sharedMaterial) {
                console.error('💍 Shared assets not available');
                return null;
            }

            // Create mesh with shared geometry and material
            const mesh = new THREE.Mesh(this.sharedGeometry, this.sharedMaterial);
            
            // Set rendering properties
            mesh.renderOrder = 1000; // Render on top
            mesh.userData.isNotificationRing = true;
            
            return mesh;
            
        } catch (error) {
            console.error('💍 Error creating ring mesh:', error);
            return null;
        }
    }

    /**
     * Find contact object in the scene
     */
    findContactObject(contactId) {
        try {
            // Try multiple methods to find the contact
            
            // Method 1: Use ContactManager if available
            if (window.app?.contactManager) {
                const contact = window.app.contactManager.getContactById(contactId);
                if (contact?.mesh) {
                    return contact.mesh;
                }
                
                // Try with contact:// prefix
                const contactWithPrefix = window.app.contactManager.getContactById(`contact://${contactId}`);
                if (contactWithPrefix?.mesh) {
                    return contactWithPrefix.mesh;
                }
            }

            // Method 2: Search through scene for contact objects
            if (window.app?.scene) {
                const contactObject = this.findContactInScene(window.app.scene, contactId);
                if (contactObject) {
                    return contactObject;
                }
            }

            // Method 3: Check global contact references
            if (window.contacts) {
                const contact = window.contacts[contactId] || window.contacts[`contact://${contactId}`];
                if (contact?.mesh) {
                    return contact.mesh;
                }
            }

            return null;
            
        } catch (error) {
            console.error('💍 Error finding contact object:', error);
            return null;
        }
    }

    /**
     * Recursively search scene for contact object
     */
    findContactInScene(object, contactId) {
        try {
            // Check if this object is a contact with matching ID
            if (object.userData?.contactId === contactId || 
                object.userData?.contactId === `contact://${contactId}`) {
                return object;
            }

            // Check children recursively
            for (const child of object.children) {
                const found = this.findContactInScene(child, contactId);
                if (found) return found;
            }

            return null;
            
        } catch (error) {
            console.error('💍 Error searching scene:', error);
            return null;
        }
    }

    /**
     * Hide all active rings
     */
    hideAllAlerts() {
        try {
            const contactIds = Array.from(this.activeRings.keys());
            contactIds.forEach(contactId => {
                this.hideAlert(contactId);
            });
            
            console.log(`💍 Hidden ${contactIds.length} alert rings`);
            
        } catch (error) {
            console.error('💍 Error hiding all alerts:', error);
        }
    }

    /**
     * Update ring configuration
     */
    updateConfig(newConfig) {
        try {
            Object.assign(this.ringConfig, newConfig);
            
            // Update shared material color if changed
            if (newConfig.color && this.sharedMaterial) {
                this.sharedMaterial.color.setHex(newConfig.color);
            }
            
            console.log('💍 Ring configuration updated:', newConfig);
            
        } catch (error) {
            console.error('💍 Error updating configuration:', error);
        }
    }

    /**
     * Get ring statistics
     */
    getStats() {
        return {
            ...this.ringStats,
            activeRingCount: this.activeRings.size,
            isInitialized: this.isInitialized,
            animationActive: !!this.animationFrame
        };
    }

    /**
     * Get active ring information
     */
    getActiveRings() {
        return Array.from(this.activeRings.entries()).map(([contactId, ringData]) => ({
            contactId,
            created: ringData.created,
            hasContact: !!ringData.contact,
            hasMesh: !!ringData.mesh
        }));
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this.debugMode = true;
        console.log('💍 Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.debugMode = false;
        console.log('💍 Debug mode disabled');
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            initialized: this.isInitialized,
            activeRings: this.getActiveRings(),
            stats: this.getStats(),
            config: this.ringConfig,
            sharedAssets: {
                geometry: !!this.sharedGeometry,
                material: !!this.sharedMaterial
            },
            scene: !!window.app?.scene,
            contactManager: !!window.app?.contactManager
        };
    }

    /**
     * Cleanup resources
     */
    dispose() {
        try {
            // Stop animation
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }

            // Hide all rings
            this.hideAllAlerts();

            // Dispose shared assets
            if (this.sharedGeometry) {
                this.sharedGeometry.dispose();
                this.sharedGeometry = null;
            }

            if (this.sharedMaterial) {
                this.sharedMaterial.dispose();
                this.sharedMaterial = null;
            }

            console.log('💍 ContactNotificationRing disposed');
            
        } catch (error) {
            console.error('💍 Error disposing notification ring:', error);
        }
    }
}

// Global functions for debugging and testing
window.debugNotificationRings = () => {
    if (window.contactNotificationRing) {
        console.log('💍 NOTIFICATION RING DEBUG INFO:');
        console.log(window.contactNotificationRing.getDebugInfo());
    } else {
        console.log('💍 ContactNotificationRing not initialized');
    }
};

window.showTestRing = (contactId) => {
    if (window.contactNotificationRing) {
        window.contactNotificationRing.showAlert(contactId);
        console.log(`💍 Test ring shown for contact ${contactId}`);
    }
};

window.hideTestRing = (contactId) => {
    if (window.contactNotificationRing) {
        window.contactNotificationRing.hideAlert(contactId);
        console.log(`💍 Test ring hidden for contact ${contactId}`);
    }
};

window.hideAllRings = () => {
    if (window.contactNotificationRing) {
        window.contactNotificationRing.hideAllAlerts();
    }
};

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContactNotificationRing;
}
