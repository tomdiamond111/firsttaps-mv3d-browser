/**
 * Bedroom Decorations Module
 * Handles all decorative elements for the bedroom theme
 */

class BedroomDecorations {
    constructor(THREE, scene, objects) {
        this.THREE = THREE;
        this.scene = scene;
        this.objects = objects;
        
        // Initialize poster creator
        this.posterCreator = new PosterCreator(THREE, scene, objects);
        
        // Initialize poster interaction system using GlobalPosterManager
        this.posterManager = null;
        if (typeof window.GlobalPosterManager !== 'undefined') {
            this.posterManager = window.GlobalPosterManager.getInstance();
            
            // Ensure the poster manager knows this is the dazzle/bedroom world
            if (this.posterManager.updateWorldType) {
                this.posterManager.updateWorldType('dazzle');
            }
            
            console.log('🖼️ GlobalPosterManager initialized for dazzle bedroom world');
        } else {
            console.log('⚠️ GlobalPosterManager not available');
        }
    }

    /**
     * Add all decorative elements to the bedroom
     */
    addAllDecorations() {
        console.log('🎀 Adding bedroom decorations...');
        
        // Phase 2 & 3: Add posters
        this.addPosters();
        
        // Future phases can be added here:
        // this.addRugs();
        // this.addCurtains();
        // this.addToys();
        // this.addLighting();
        
        console.log('✨ All bedroom decorations added!');
    }

    /**
     * Phase 2 & 3: Add posters to walls
     */
    addPosters() {
        console.log('🖼️ Phase 2 & 3: Adding posters...');
        
        try {
            const posters = this.posterCreator.createAllPosters();
            console.log(`🎨 Successfully created ${posters.length} posters`);
            
            // Set up double-tap interaction for each poster
            if (this.posterInteraction) {
                posters.forEach(poster => {
                    // Preserve existing userData and add interaction properties
                    poster.userData = {
                        ...poster.userData,
                        hasDoubleTabInteraction: true,
                        interactionHandler: this.posterInteraction,
                        type: 'poster', // Ensure type is preserved
                        interactable: true // Ensure interactable is preserved
                    };
                });
                console.log('🖱️ Double-tap interactions enabled for all posters');
                
                // Restore poster URLs after a brief delay to ensure all posters are fully created
                // and persistence channel is ready
                setTimeout(() => {
                    this.posterInteraction.restorePosterURLs();
                }, 500); // Increased delay to ensure persistence channel is fully initialized
            } else {
                console.log('⚠️ Poster interaction system not available for restoration');
            }
            
            return posters;
        } catch (error) {
            console.error('❌ Error creating posters:', error);
            return [];
        }
    }

    /**
     * Future Phase: Add rugs (placeholder)
     */
    addRugs() {
        console.log('🏠 Future: Adding rugs...');
        // Implementation for future phase
    }

    /**
     * Future Phase: Add curtains (placeholder)
     */
    addCurtains() {
        console.log('🪟 Future: Adding curtains...');
        // Implementation for future phase
    }

    /**
     * Future Phase: Add toys (placeholder)
     */
    addToys() {
        console.log('🧸 Future: Adding toys...');
        // Implementation for future phase
    }

    /**
     * Future Phase: Add enhanced lighting (placeholder)
     */
    addLighting() {
        console.log('💡 Future: Adding enhanced lighting...');
        // Implementation for future phase
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BedroomDecorations;
} else if (typeof window !== 'undefined') {
    window.BedroomDecorations = BedroomDecorations;
}
