// Furniture Diagnostic Script
// Run this in the browser console to check furniture manager status

console.log('=== FURNITURE DIAGNOSTIC ===');

// Check if furniture manager exists
console.log('window.app exists:', !!window.app);
console.log('window.app.furnitureManager exists:', !!(window.app && window.app.furnitureManager));

// Check if Flutter channel exists
console.log('window.FurniturePersistenceChannel exists:', !!window.FurniturePersistenceChannel);

// Check furniture storage
if (window.app && window.app.furnitureManager) {
    console.log('Furniture manager:', window.app.furnitureManager);
    console.log('Storage manager:', window.app.furnitureManager.storageManager);
    console.log('Visual manager:', window.app.furnitureManager.visualManager);
    
    if (window.app.furnitureManager.storageManager) {
        console.log('Furniture count:', window.app.furnitureManager.storageManager.furniture.size);
        console.log('Furniture map:', window.app.furnitureManager.storageManager.furniture);
        
        // List all furniture
        const allFurniture = window.app.furnitureManager.getAllFurniture();
        console.log('All furniture:', allFurniture);
        
        // Check for markers
        if (window.app.furnitureManager.visualManager) {
            const markers = window.app.furnitureManager.visualManager.getAllSlotMarkers();
            console.log('Slot markers:', markers);
        }
    }
} else {
    console.log('❌ Furniture manager not initialized!');
    console.log('Attempting to initialize...');
    
    // Try to manually initialize
    setTimeout(() => {
        if (window.app && !window.app.furnitureManager && window.FurnitureManager) {
            console.log('Manually creating furniture manager...');
            window.app.furnitureManager = new window.FurnitureManager(window.app);
            window.app.furnitureManager.initialize().then(() => {
                console.log('✅ Manual initialization complete');
                
                // Check again
                if (window.app.furnitureManager.storageManager) {
                    console.log('Furniture count after init:', window.app.furnitureManager.storageManager.furniture.size);
                }
            });
        }
    }, 1000);
}

console.log('=== END DIAGNOSTIC ===');
