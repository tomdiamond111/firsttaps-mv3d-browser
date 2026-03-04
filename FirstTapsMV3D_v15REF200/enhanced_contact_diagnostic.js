/**
 * ENHANCED CONTACT POSITION DIAGNOSTIC
 * 
 * This enhanced diagnostic will help us understand:
 * 1. What positions Flutter sends to JavaScript during world initialization
 * 2. What happens when ObjectMovedChannel receives contact position updates
 * 3. Whether contacts are being restored to their persisted positions after world re-entry
 */

console.log('🔍 ENHANCED CONTACT POSITION DIAGNOSTIC - Loading...');

// Enhanced storage for better tracking
window.enhancedContactDiagnostic = {
    initialPositions: new Map(),        // Positions when first loaded from Flutter
    originalPositions: new Map(),       // Positions when first created in 3D world
    persistedPositions: new Map(),      // Positions sent via ObjectMovedChannel
    restoreAttempts: [],                // Track restore attempts
    
    // Initialize diagnostic
    init() {
        console.log('🚀 Enhanced Contact Position Diagnostic initialized');
        this.interceptObjectMovedChannel();
        this.interceptContactManager();
        this.monitorWorldReEntry();
    },
    
    // Intercept ObjectMovedChannel to track persistence
    interceptObjectMovedChannel() {
        if (!window.ObjectMovedChannel) {
            console.warn('❌ ObjectMovedChannel not available - cannot monitor position persistence');
            return;
        }
        
        console.log('📡 Intercepting ObjectMovedChannel for contact position tracking...');
        
        const originalPostMessage = window.ObjectMovedChannel.postMessage;
        
        window.ObjectMovedChannel.postMessage = (data) => {
            try {
                const moveData = JSON.parse(data);
                
                if (moveData.id && moveData.id.startsWith('contact://')) {
                    const contactId = moveData.id.replace('contact://', '');
                    
                    console.log('🔄 DIAGNOSTIC: Contact position being persisted:');
                    console.log(`   Contact ID: ${contactId}`);
                    console.log(`   Position: (${moveData.x}, ${moveData.y}, ${moveData.z})`);
                    console.log(`   Zone: ${moveData.zone || 'unknown'}`);
                    console.log(`   Timestamp: ${moveData.timestamp}`);
                    
                    this.persistedPositions.set(contactId, {
                        x: moveData.x,
                        y: moveData.y,
                        z: moveData.z,
                        zone: moveData.zone,
                        timestamp: moveData.timestamp,
                        raw: moveData
                    });
                    
                    console.log(`📝 Stored persisted position for ${contactId}`);
                    
                    // Check if this position differs from initial position
                    const initialPos = this.initialPositions.get(contactId);
                    if (initialPos) {
                        const distance = Math.sqrt(
                            Math.pow(moveData.x - initialPos.x, 2) +
                            Math.pow(moveData.y - initialPos.y, 2) +
                            Math.pow(moveData.z - initialPos.z, 2)
                        );
                        console.log(`📊 Distance from initial position: ${distance.toFixed(3)}`);
                    }
                }
            } catch (error) {
                console.warn('🔍 DIAGNOSTIC: Error parsing ObjectMovedChannel data:', error);
            }
            
            return originalPostMessage.call(this, data);
        };
        
        console.log('✅ ObjectMovedChannel interceptor installed');
    },
    
    // Monitor when contacts are created/loaded to capture initial positions
    interceptContactManager() {
        // Wait for ContactManager to be available
        const checkContactManager = () => {
            if (window.app?.contactManager) {
                console.log('📱 ContactManager detected - setting up monitoring...');
                this.captureInitialContactPositions();
                
                // Monitor contact creation
                if (typeof window.app.contactManager.getAllContacts === 'function') {
                    const originalGetAllContacts = window.app.contactManager.getAllContacts;
                    window.app.contactManager.getAllContacts = (...args) => {
                        const result = originalGetAllContacts.apply(this, args);
                        
                        // Check for new contacts
                        setTimeout(() => {
                            this.captureInitialContactPositions();
                        }, 100);
                        
                        return result;
                    };
                }
            } else {
                setTimeout(checkContactManager, 500);
            }
        };
        
        checkContactManager();
    },
    
    // Capture positions when contacts are first loaded from Flutter
    captureInitialContactPositions() {
        if (!window.app?.contactManager) return;
        
        const allContacts = window.app.contactManager.getAllContacts();
        
        allContacts.forEach(contact => {
            if (contact.mesh && contact.contactData) {
                const contactId = contact.contactData.id;
                const position = contact.mesh.position;
                
                // Only capture if we haven't recorded this contact's initial position
                if (!this.initialPositions.has(contactId)) {
                    this.initialPositions.set(contactId, {
                        x: position.x,
                        y: position.y,
                        z: position.z,
                        timestamp: Date.now(),
                        source: 'flutter_initialization'
                    });
                    
                    console.log(`📍 INITIAL POSITION captured for ${contact.contactData.name}: (${position.x}, ${position.y}, ${position.z})`);
                }
                
                // Also update original positions for comparison
                this.originalPositions.set(contactId, {
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    timestamp: Date.now()
                });
            }
        });
        
        console.log(`📊 Captured initial positions for ${this.initialPositions.size} contacts`);
    },
    
    // Monitor world re-entry events
    monitorWorldReEntry() {
        // Monitor for world reloads or re-entry
        let lastContactCount = 0;
        
        setInterval(() => {
            if (window.app?.contactManager) {
                const currentCount = window.app.contactManager.getAllContacts().length;
                
                if (currentCount > 0 && currentCount !== lastContactCount) {
                    console.log(`🔄 Contact count changed: ${lastContactCount} → ${currentCount}`);
                    
                    if (lastContactCount === 0 && currentCount > 0) {
                        console.log('🌟 WORLD RE-ENTRY DETECTED - analyzing position restoration...');
                        setTimeout(() => {
                            this.analyzePositionRestoration();
                        }, 1000);
                    }
                    
                    lastContactCount = currentCount;
                }
            }
        }, 1000);
    },
    
    // Analyze whether positions were correctly restored
    analyzePositionRestoration() {
        console.log('🔍 ANALYZING POSITION RESTORATION...');
        console.log('');
        
        if (!window.app?.contactManager) {
            console.error('❌ ContactManager not available');
            return;
        }
        
        const allContacts = window.app.contactManager.getAllContacts();
        
        console.log(`📊 Found ${allContacts.length} contacts to analyze:`);
        console.log('');
        
        allContacts.forEach((contact, index) => {
            if (contact.mesh && contact.contactData) {
                const contactId = contact.contactData.id;
                const contactName = contact.contactData.name;
                const currentPos = contact.mesh.position;
                
                console.log(`Contact ${index + 1}: ${contactName} (${contactId})`);
                console.log(`   Current Position: (${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)})`);
                
                // Check against initial Flutter position
                const initialPos = this.initialPositions.get(contactId);
                if (initialPos) {
                    console.log(`   Initial Flutter Position: (${initialPos.x.toFixed(2)}, ${initialPos.y.toFixed(2)}, ${initialPos.z.toFixed(2)})`);
                    
                    const initialDistance = Math.sqrt(
                        Math.pow(currentPos.x - initialPos.x, 2) +
                        Math.pow(currentPos.y - initialPos.y, 2) +
                        Math.pow(currentPos.z - initialPos.z, 2)
                    );
                    
                    if (initialDistance < 0.1) {
                        console.log(`   ✅ Position matches Flutter initialization data`);
                    } else {
                        console.log(`   📏 Distance from Flutter init: ${initialDistance.toFixed(3)}`);
                    }
                }
                
                // Check against persisted position
                const persistedPos = this.persistedPositions.get(contactId);
                if (persistedPos) {
                    console.log(`   Last Persisted Position: (${persistedPos.x.toFixed(2)}, ${persistedPos.y.toFixed(2)}, ${persistedPos.z.toFixed(2)}) [${persistedPos.zone}]`);
                    
                    const persistedDistance = Math.sqrt(
                        Math.pow(currentPos.x - persistedPos.x, 2) +
                        Math.pow(currentPos.y - persistedPos.y, 2) +
                        Math.pow(currentPos.z - persistedPos.z, 2)
                    );
                    
                    if (persistedDistance < 0.1) {
                        console.log(`   ✅ Position matches last persisted position - PERSISTENCE WORKING!`);
                    } else {
                        console.warn(`   ❌ Position does NOT match persisted position (distance: ${persistedDistance.toFixed(3)})`);
                        console.warn(`   🔍 This indicates Flutter is not restoring the persisted position correctly!`);
                    }
                } else {
                    console.log(`   ⚠️ No persisted position data available for comparison`);
                }
                
                console.log('');
            }
        });
        
        this.generateRestoreReport();
    },
    
    // Generate a comprehensive restore report
    generateRestoreReport() {
        console.log('📋 POSITION RESTORATION REPORT:');
        console.log('');
        
        console.log(`Initial Positions Captured: ${this.initialPositions.size}`);
        this.initialPositions.forEach((pos, id) => {
            console.log(`   ${id}: (${pos.x}, ${pos.y}, ${pos.z}) from ${pos.source}`);
        });
        
        console.log('');
        console.log(`Persisted Positions Recorded: ${this.persistedPositions.size}`);
        this.persistedPositions.forEach((pos, id) => {
            console.log(`   ${id}: (${pos.x}, ${pos.y}, ${pos.z}) [${pos.zone}] @ ${new Date(pos.timestamp).toLocaleTimeString()}`);
        });
        
        console.log('');
        console.log('🔧 DIAGNOSTIC COMMANDS:');
        console.log('   • window.enhancedContactDiagnostic.analyzePositionRestoration() - Run analysis again');
        console.log('   • window.enhancedContactDiagnostic.showFullReport() - Show detailed report');
        console.log('   • window.enhancedContactDiagnostic.comparePositions() - Compare all position data');
    },
    
    // Show full detailed report
    showFullReport() {
        console.log('📊 FULL CONTACT POSITION DIAGNOSTIC REPORT:');
        console.log('=====================================');
        
        if (window.app?.contactManager) {
            const allContacts = window.app.contactManager.getAllContacts();
            
            allContacts.forEach(contact => {
                if (contact.mesh && contact.contactData) {
                    const contactId = contact.contactData.id;
                    const currentPos = contact.mesh.position;
                    const initialPos = this.initialPositions.get(contactId);
                    const persistedPos = this.persistedPositions.get(contactId);
                    
                    console.log(`\n📱 ${contact.contactData.name} (${contactId}):`);
                    console.log(`   Current:   (${currentPos.x.toFixed(3)}, ${currentPos.y.toFixed(3)}, ${currentPos.z.toFixed(3)})`);
                    
                    if (initialPos) {
                        console.log(`   Initial:   (${initialPos.x.toFixed(3)}, ${initialPos.y.toFixed(3)}, ${initialPos.z.toFixed(3)}) [${initialPos.source}]`);
                    }
                    
                    if (persistedPos) {
                        console.log(`   Persisted: (${persistedPos.x.toFixed(3)}, ${persistedPos.y.toFixed(3)}, ${persistedPos.z.toFixed(3)}) [${persistedPos.zone}]`);
                    }
                }
            });
        }
    },
    
    // Compare all position data
    comparePositions() {
        this.analyzePositionRestoration();
    }
};

// Initialize the enhanced diagnostic
window.enhancedContactDiagnostic.init();

console.log('✅ Enhanced Contact Position Diagnostic loaded');
console.log('🔧 Available at: window.enhancedContactDiagnostic');
