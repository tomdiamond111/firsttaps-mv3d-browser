// Contact System Diagnostic Script
// This script will help diagnose why contact objects can't be tapped

console.log('=== CONTACT SYSTEM DIAGNOSTIC ===');

// Check if ContactManager exists and has contacts
if (window.app && window.app.contactManager) {
    console.log('✅ ContactManager found');
    const contacts = window.app.contactManager.contacts;
    console.log(`📱 Total contacts in manager: ${contacts.size}`);
    
    // Check each contact
    contacts.forEach((contact, id) => {
        console.log(`📱 Contact: ${id}`);
        console.log(`  - Name: ${contact.contactData.name}`);
        console.log(`  - Mesh exists: ${!!contact.mesh}`);
        console.log(`  - Mesh in scene: ${contact.scene.children.includes(contact.mesh)}`);
        console.log(`  - UserData type: ${contact.mesh?.userData?.type}`);
        console.log(`  - UserData subType: ${contact.mesh?.userData?.subType}`);
        console.log(`  - UserData isContact: ${contact.mesh?.userData?.isContact}`);
        console.log(`  - UserData fileName: ${contact.mesh?.userData?.fileName}`);
    });
} else {
    console.log('❌ ContactManager not found');
}

// Check fileObjects array
if (window.app && window.app.stateManager && window.app.stateManager.fileObjects) {
    const fileObjects = window.app.stateManager.fileObjects;
    console.log(`📁 Total objects in fileObjects array: ${fileObjects.length}`);
    
    // Count contact objects in fileObjects
    const contactObjects = fileObjects.filter(obj => 
        obj.userData && obj.userData.subType === 'contact'
    );
    console.log(`📱 Contact objects in fileObjects: ${contactObjects.length}`);
    
    // List all contact objects
    contactObjects.forEach((obj, index) => {
        console.log(`📱 FileObject Contact ${index + 1}:`);
        console.log(`  - Name: ${obj.userData.fileName}`);
        console.log(`  - Type: ${obj.userData.type}`);
        console.log(`  - SubType: ${obj.userData.subType}`);
        console.log(`  - IsContact: ${obj.userData.isContact}`);
        console.log(`  - Position: (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
        console.log(`  - Material type: ${obj.material.constructor.name}`);
        console.log(`  - Material count: ${Array.isArray(obj.material) ? obj.material.length : 1}`);
    });
} else {
    console.log('❌ StateManager or fileObjects not found');
}

// Check for recent "Ji" objects in the scene
console.log('🔍 Checking scene for potential "Ji" objects...');
if (window.app && window.app.scene) {
    const scene = window.app.scene;
    let jiObjectCount = 0;
    
    scene.traverse((object) => {
        if (object.constructor.name === 'Ji' || object.type === 'Ji') {
            jiObjectCount++;
            console.log(`⚠️ Found Ji object: ${object.uuid}`, object);
        }
    });
    
    console.log(`🔍 Total "Ji" objects found: ${jiObjectCount}`);
}

// Test raycasting specifically for contact objects
console.log('🎯 Testing raycasting for contact objects...');
if (window.app && window.app.inputManager) {
    const inputManager = window.app.inputManager;
    
    // Get current mouse position (or use center of screen)
    const mouse = new THREE.Vector2(0, 0); // Center of screen
    
    // Test raycasting
    const intersects = inputManager.getIntersectedObjects(mouse);
    console.log(`🎯 Raycaster found ${intersects.length} intersections at screen center`);
    
    intersects.forEach((intersection, index) => {
        const obj = intersection.object;
        console.log(`🎯 Intersection ${index + 1}:`);
        console.log(`  - Object type: ${obj.constructor.name}`);
        console.log(`  - Has userData: ${!!obj.userData}`);
        console.log(`  - UserData type: ${obj.userData?.type}`);
        console.log(`  - UserData subType: ${obj.userData?.subType}`);
        console.log(`  - UserData fileName: ${obj.userData?.fileName}`);
        console.log(`  - Distance: ${intersection.distance.toFixed(2)}`);
    });
}

console.log('=== DIAGNOSTIC COMPLETE ===');
