/**
 * AUTOMATED SCREENSHOT SYSTEM
 * Creates high-resolution marketing screenshots of different world themes
 * Run this in the browser console when your app is loaded
 */

class ScreenshotAutomation {
    constructor() {
        this.screenshots = [];
        this.currentIndex = 0;
        this.isCapturing = false;
    }
    
    /**
     * Capture screenshots of all world themes automatically
     */
    async captureAllWorldThemes() {
        if (this.isCapturing) {
            console.log('📸 Screenshot capture already in progress...');
            return;
        }
        
        this.isCapturing = true;
        console.log('📸 Starting automated screenshot capture...');
        
        const worldThemes = [
            { id: 'greenplane', name: 'Green Plane', premium: false },
            { id: 'ocean', name: 'Ocean World', premium: false },
            { id: 'space', name: 'Space World', premium: false },
            { id: 'dazzle', name: 'Dazzle World', premium: true },
            { id: 'forest', name: 'Forest Realm', premium: true },
            { id: 'christmas', name: 'Christmasland', premium: true },
            { id: 'tropical-paradise', name: 'Tropical Paradise', premium: true },
            { id: 'flower-wonderland', name: 'Flower Wonderland', premium: true },
            { id: 'desert-oasis', name: 'Desert Oasis', premium: true }
        ];
        
        for (const theme of worldThemes) {
            await this.captureWorldTheme(theme);
            await this.delay(2000); // Wait 2 seconds between captures
        }
        
        this.isCapturing = false;
        console.log('📸 ✅ All screenshots captured successfully!');
        this.downloadAllScreenshots();
    }
    
    /**
     * Capture screenshot of specific world theme
     */
    async captureWorldTheme(theme) {
        console.log(`📸 Capturing ${theme.name}...`);
        
        try {
            // Switch to the world theme
            if (window.app && window.app.premiumIntegration) {
                const result = window.app.premiumIntegration.switchWorldTheme(theme.id);
                if (!result.success) {
                    console.warn(`⚠️ Could not switch to ${theme.name}`);
                    return;
                }
            }
            
            // Wait for world to load
            await this.delay(3000);
            
            // Position camera for best shot
            this.positionCameraForScreenshot();
            
            // Wait for render
            await this.delay(1000);
            
            // Capture high-res screenshot
            const screenshot = this.captureHighResScreenshot(1920, 1080, theme.name);
            this.screenshots.push({
                name: theme.name,
                filename: `firsttaps_${theme.id}_1920x1080.png`,
                data: screenshot,
                premium: theme.premium
            });
            
            console.log(`📸 ✅ ${theme.name} captured`);
            
        } catch (error) {
            console.error(`📸 ❌ Error capturing ${theme.name}:`, error);
        }
    }
    
    /**
     * Position camera for optimal screenshot
     */
    positionCameraForScreenshot() {
        if (!window.app || !window.app.camera) return;
        
        // Position camera to show good overview of the world
        window.app.camera.position.set(15, 10, 15);
        window.app.camera.lookAt(0, 0, 0);
        
        // Update camera
        if (window.app.controls) {
            window.app.controls.update();
        }
    }
    
    /**
     * Capture high-resolution screenshot
     */
    captureHighResScreenshot(width, height, themeName) {
        if (!window.app || !window.app.renderer) return null;
        
        // Store original size
        const originalSize = window.app.renderer.getSize(new THREE.Vector2());
        
        // Set high resolution
        window.app.renderer.setSize(width, height);
        
        // Render frame
        window.app.renderer.render(window.app.scene, window.app.camera);
        
        // Get canvas data
        const canvas = window.app.renderer.domElement;
        const dataURL = canvas.toDataURL('image/png');
        
        // Restore original size
        window.app.renderer.setSize(originalSize.x, originalSize.y);
        
        return dataURL;
    }
    
    /**
     * Download all captured screenshots
     */
    downloadAllScreenshots() {
        console.log(`📸 Downloading ${this.screenshots.length} screenshots...`);
        
        this.screenshots.forEach((screenshot, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.download = screenshot.filename;
                link.href = screenshot.data;
                link.click();
                
                console.log(`📸 Downloaded: ${screenshot.filename}`);
            }, index * 500); // Stagger downloads
        });
    }
    
    /**
     * Capture single custom screenshot
     */
    captureSingle(width = 1920, height = 1080, filename = 'screenshot') {
        const dataURL = this.captureHighResScreenshot(width, height);
        if (dataURL) {
            const link = document.createElement('a');
            link.download = `${filename}_${width}x${height}.png`;
            link.href = dataURL;
            link.click();
            
            console.log(`📸 Screenshot saved: ${filename}_${width}x${height}.png`);
        }
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Make globally available
window.ScreenshotAutomation = ScreenshotAutomation;

// Quick usage functions
window.captureAllWorlds = async function() {
    const automation = new ScreenshotAutomation();
    await automation.captureAllWorldThemes();
};

window.captureCurrentWorld = function(width = 1920, height = 1080) {
    const automation = new ScreenshotAutomation();
    automation.captureSingle(width, height, 'current_world');
};

console.log(`
📸 SCREENSHOT AUTOMATION LOADED

Usage:
======
// Capture all world themes automatically:
captureAllWorlds();

// Capture current world in high-res:
captureCurrentWorld(1920, 1080);

// Custom capture:
const automation = new ScreenshotAutomation();
automation.captureSingle(2400, 1600, 'marketing_shot');
`);

console.log('📸 Screenshot Automation system loaded');