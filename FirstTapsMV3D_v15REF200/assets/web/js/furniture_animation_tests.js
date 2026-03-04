/**
 * Furniture Idle Animation Test Utilities
 * 
 * Run these commands in browser console to test and debug idle animations
 */

window.FurnitureAnimationTests = {
    
    /**
     * Check if animation system is initialized
     */
    checkInitialization() {
        console.log('=== Furniture Idle Animation System Check ===');
        
        const hasVisualManager = !!window.app?.furnitureManager?.visualManager;
        console.log(`✓ Visual Manager: ${hasVisualManager ? 'EXISTS' : '❌ MISSING'}`);
        
        const hasAnimationManager = !!window.app?.furnitureManager?.visualManager?.idleAnimationManager;
        console.log(`✓ Animation Manager: ${hasAnimationManager ? 'EXISTS' : '❌ MISSING'}`);
        
        if (hasAnimationManager) {
            const isEnabled = window.app.furnitureManager.visualManager.idleAnimationManager.isEnabled;
            console.log(`✓ Animations Enabled: ${isEnabled ? 'YES' : 'NO'}`);
        }
        
        return hasAnimationManager;
    },
    
    /**
     * List all furniture and their playback states
     */
    listFurniture() {
        console.log('=== Furniture List ===');
        
        if (!window.app?.furnitureManager?.storageManager) {
            console.error('❌ Furniture manager not found');
            return;
        }
        
        const furniture = window.app.furnitureManager.storageManager.getAllFurniture();
        console.log(`Total furniture: ${furniture.length}`);
        
        furniture.forEach((f, index) => {
            const animating = !f.isPlaying ? '🎨 ANIMATING' : '⏸️  Paused (in playback)';
            console.log(`${index + 1}. ${f.name} (${f.type}) - ${animating}`);
            console.log(`   - Style: ${f.style}`);
            console.log(`   - Position: (${f.position.x.toFixed(1)}, ${f.position.y.toFixed(1)}, ${f.position.z.toFixed(1)})`);
            console.log(`   - Capacity: ${f.objectIds.length}/${f.capacity} objects`);
        });
    },
    
    /**
     * Toggle animations on/off
     */
    toggleAnimations() {
        const manager = window.app?.furnitureManager?.visualManager?.idleAnimationManager;
        if (!manager) {
            console.error('❌ Animation manager not found');
            return;
        }
        
        const newState = !manager.isEnabled;
        manager.setEnabled(newState);
        console.log(`Animations ${newState ? 'ENABLED ✓' : 'DISABLED ✗'}`);
    },
    
    /**
     * Force stop all animations (for testing)
     */
    stopAllAnimations() {
        const visualManager = window.app?.furnitureManager?.visualManager;
        const animManager = visualManager?.idleAnimationManager;
        
        if (!visualManager || !animManager) {
            console.error('❌ Managers not found');
            return;
        }
        
        console.log('Stopping all animations...');
        visualManager.activeFurniture.forEach((furniture, furnitureId) => {
            animManager.stopAnimation(furnitureId, visualManager);
        });
        console.log('✓ All animations stopped');
    },
    
    /**
     * Measure animation performance
     */
    measurePerformance(iterations = 100) {
        const manager = window.app?.furnitureManager?.visualManager?.idleAnimationManager;
        const visualManager = window.app?.furnitureManager?.visualManager;
        
        if (!manager || !visualManager) {
            console.error('❌ Managers not found');
            return;
        }
        
        console.log(`Measuring performance over ${iterations} iterations...`);
        
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            manager.updateAllAnimations(visualManager, performance.now());
            const duration = performance.now() - start;
            times.push(duration);
        }
        
        const avg = times.reduce((a, b) => a + b) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        console.log('=== Performance Results ===');
        console.log(`Average: ${avg.toFixed(3)}ms`);
        console.log(`Min: ${min.toFixed(3)}ms`);
        console.log(`Max: ${max.toFixed(3)}ms`);
        console.log(`\nFor 60fps, budget is 16.67ms per frame`);
        console.log(`Animation overhead: ${(avg / 16.67 * 100).toFixed(1)}% of frame budget`);
    },
    
    /**
     * Test material color preservation
     */
    checkColorPreservation() {
        console.log('=== Material Color Check ===');
        
        const visualManager = window.app?.furnitureManager?.visualManager;
        if (!visualManager) {
            console.error('❌ Visual manager not found');
            return;
        }
        
        visualManager.activeFurniture.forEach((furniture, furnitureId) => {
            const visualElements = visualManager.furnitureMeshes.get(furnitureId);
            if (!visualElements?.structure?.length) return;
            
            console.log(`\n${furniture.name} (${furniture.style}):`);
            visualElements.structure.forEach((mesh, index) => {
                if (index > 0) return; // Only show first mesh
                
                const baseColor = `#${mesh.material.color.getHexString()}`;
                const emissiveColor = `#${mesh.material.emissive.getHexString()}`;
                const emissiveIntensity = mesh.material.emissiveIntensity.toFixed(3);
                
                console.log(`  Base Color: ${baseColor}`);
                console.log(`  Emissive Color: ${emissiveColor}`);
                console.log(`  Emissive Intensity: ${emissiveIntensity}`);
            });
        });
    },
    
    /**
     * Manually trigger animation for specific furniture (for visual testing)
     */
    animateFurniture(furnitureName) {
        const furniture = window.app?.furnitureManager?.storageManager
            .getAllFurniture()
            .find(f => f.name.toLowerCase().includes(furnitureName.toLowerCase()));
            
        if (!furniture) {
            console.error(`❌ Furniture not found: "${furnitureName}"`);
            console.log('Available furniture:');
            this.listFurniture();
            return;
        }
        
        console.log(`Testing animation for: ${furniture.name}`);
        
        const visualManager = window.app.furnitureManager.visualManager;
        const animManager = visualManager.idleAnimationManager;
        
        // Ensure not in playback mode
        furniture.isPlaying = false;
        
        // Run animation for 5 seconds
        console.log('Running animation for 5 seconds...');
        const startTime = performance.now();
        
        const interval = setInterval(() => {
            animManager.updateFurnitureAnimation(
                furniture.id,
                furniture,
                visualManager,
                performance.now()
            );
            
            if (performance.now() - startTime > 5000) {
                clearInterval(interval);
                console.log('✓ Animation test complete');
            }
        }, 16); // ~60fps
    },
    
    /**
     * Get current animation parameters
     */
    getAnimationParams() {
        const manager = window.app?.furnitureManager?.visualManager?.idleAnimationManager;
        if (!manager) {
            console.error('❌ Animation manager not found');
            return;
        }
        
        console.log('=== Current Animation Parameters ===');
        console.log(JSON.stringify(manager.params, null, 2));
    }
};

// Quick access aliases
window.testFurnitureAnimations = window.FurnitureAnimationTests;

console.log('🎨 Furniture Animation Test Utilities loaded!');
console.log('Run: FurnitureAnimationTests.checkInitialization()');
console.log('Or:  testFurnitureAnimations.listFurniture()');
