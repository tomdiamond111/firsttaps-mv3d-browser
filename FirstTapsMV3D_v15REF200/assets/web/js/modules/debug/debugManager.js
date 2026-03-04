// modules/debug/debugManager.js
// Dependencies: THREE (global), window.SharedStateManager
// Exports: window.DebugManager

(function() {
    'use strict';
    
    console.log("Loading DebugManager module...");
    
    // ============================================================================
    // DEBUG AND TEST FUNCTIONS MANAGER
    // ============================================================================
    class DebugManager {
        constructor(app) {
            this.app = app;
            this.THREE = app.THREE;
            this.scene = app.scene;
            this.camera = app.camera;
            this.renderer = app.renderer;
            this.cameraControls = app.cameraControls;
            this.stateManager = app.stateManager;
            this.billboardManager = app.billboardManager;
            this.cameraManager = app.cameraManager;
        }

        /**
         * Debug method to log current camera control settings
         */
        debugCameraControlSettings() {
            return this.cameraManager.debugCameraControlSettings();
        }

        testMobileCameraControls() {
            return this.cameraManager.testMobileCameraControls();
        }

        // Debug and test functions
        toggleFaceTextures() {
            this.stateManager.currentDisplayOptions.useFaceTextures = !this.stateManager.currentDisplayOptions.useFaceTextures;
            console.log('=== FACE TEXTURE TOGGLE ===');
            console.log('Face textures:', this.stateManager.currentDisplayOptions.useFaceTextures ? 'ENABLED' : 'DISABLED');
            
            // CRITICAL: Clear processed objects set to allow re-processing
            this.stateManager.processedTextureObjects.clear();
            console.log('Cleared processed texture objects set');
            
            console.log('Updating all object visuals...');
            if (this.billboardManager) {
                this.billboardManager.updateAllObjectVisuals();
            }
            console.log('=== TOGGLE COMPLETE ===');
        }

        testFaceTextures() {
            console.log('=== TESTING FACE TEXTURES ===');
            console.log('Current useFaceTextures setting:', this.stateManager.currentDisplayOptions.useFaceTextures);
            console.log('Available objects:', this.stateManager.fileObjects.length);
            
            // Force enable face textures
            this.stateManager.currentDisplayOptions.useFaceTextures = true;
            console.log('Force enabled face textures');
            
            // Update all visuals
            if (this.billboardManager) {
                this.billboardManager.updateAllObjectVisuals();
            }
            console.log('=== TEST COMPLETE ===');
        }

        debugInteractions() {
            console.log('=== INTERACTION DEBUG ===');
            console.log('Camera controls enabled:', this.cameraControls.enabled);
            console.log('Camera rotation enabled:', this.cameraControls.enableRotate);
            console.log('Objects in scene:', this.stateManager.fileObjects.length);
            
            this.stateManager.fileObjects.forEach((object, index) => {
                console.log(`Object ${index}:`, {
                    name: object.userData.fileName,
                    id: object.userData.id,
                    uuid: object.uuid,
                    visible: object.visible,
                    materialType: Array.isArray(object.material) ? 'Array' : object.material.type,
                    inScene: this.scene.children.includes(object)
                });
            });
            
            console.log('Selected object:', this.stateManager.selectedObject);
            console.log('Moving object:', this.stateManager.movingObject);
            console.log('=== DEBUG COMPLETE ===');
        }

        emergencyStop() {
            console.log('=== EMERGENCY STOP ACTIVATED ===');
            console.log('Stopping all face texture processing...');
            
            // CRITICAL: Reset all loop prevention flags
            this.stateManager.isProcessingVisuals = false;
            this.stateManager.processedTextureObjects.clear();
            this.stateManager.lastVisualsUpdate = 0;
            
            // NOTE: Preserve face texture setting during emergency stop to prevent unwanted toggles during world switches
            // this.stateManager.currentDisplayOptions.useFaceTextures = false;
            
            // Clear all processing states
            this.stateManager.labelObjectsMap.forEach((attachments, uuid) => {
                if (attachments.faceTexture === 'PROCESSING') {
                    attachments.faceTexture = null;
                }
            });
            
            // Force reset all systems
            this.app.resetHomeView();
            
            console.log('Emergency stop complete - all processing flags reset');
            console.log('Face textures disabled, processed objects cleared');
            console.log('Use Home View button to restore full functionality');
            console.log('=== EMERGENCY STOP COMPLETE ===');
        }

        // World management functions
        debugWorldStates() {
            console.log('=== WORLD STATE DEBUG ===');
            console.log('Current world type:', this.stateManager.currentWorldType);
            console.log('Objects with world states:', this.stateManager.worldObjectStates.size);
            
            this.stateManager.worldObjectStates.forEach((worldStates, objectUuid) => {
                const object = this.stateManager.fileObjects.find(obj => obj.uuid === objectUuid);
                const fileName = object ? object.userData.fileName : 'Unknown';
                console.log(`Object ${fileName} (${objectUuid}):`, Array.from(worldStates.keys()));
            });
            
            console.log('=== DEBUG COMPLETE ===');
        }

        testWorldSwitching() {
            console.log('=== TESTING WORLD SWITCHING ===');
            const currentWorld = this.app.getCurrentWorldType();
            const targetWorld = currentWorld === 'green-plane' ? 'space' : 'green-plane';
            
            console.log(`Switching from ${currentWorld} to ${targetWorld}`);
            this.app.switchWorldTemplate(targetWorld);
            
            setTimeout(() => {
                console.log(`Switching back from ${targetWorld} to ${currentWorld}`);
                this.app.switchWorldTemplate(currentWorld);
                console.log('=== WORLD SWITCHING TEST COMPLETE ===');
            }, 2000);
        }

        // Utility functions for debugging
        getObjectCountJS() {
            console.log('Current fileObjects count:', this.stateManager.fileObjects.length);
            console.log('Scene children count:', this.scene.children.length);
            console.log('Scene children types:', this.scene.children.map(child => child.type));
            return {
                fileObjects: this.stateManager.fileObjects.length,
                sceneChildren: this.scene.children.length,
                sceneChildTypes: this.scene.children.map(child => child.type)
            };
        }

        forceRenderJS() {
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
                console.log('Forced render via forceRenderJS');
                return true;
            }
            return false;
        }

        /**
         * Setup global debug functions for external access
         */
        setupGlobalDebugFunctions() {
            // Debug functions
            window.debugCameraControlSettings = this.debugCameraControlSettings.bind(this);
            window.debugCameraActionConstants = () => {
                if (this.cameraManager) {
                    this.cameraManager.debugCameraActionConstants();
                } else {
                    console.error('CameraManager not initialized');
                }
            };
            window.testMobileCameraControls = () => {
                if (this.cameraManager) {
                    this.cameraManager.testMobileCameraControls();
                } else {
                    console.error('CameraManager not initialized');
                }
            };

            // Debug utility functions
            window.toggleFaceTextures = this.toggleFaceTextures.bind(this);
            window.testFaceTextures = this.testFaceTextures.bind(this);
            window.debugInteractions = this.debugInteractions.bind(this);
            window.emergencyStop = this.emergencyStop.bind(this);
            window.debugWorldStates = this.debugWorldStates.bind(this);
            window.testWorldSwitching = this.testWorldSwitching.bind(this);
            window.getObjectCountJS = this.getObjectCountJS.bind(this);
            window.forceRenderJS = this.forceRenderJS.bind(this);

            console.log('Debug functions registered globally');
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.DebugManager = DebugManager;
    
    console.log("DebugManager module loaded - DebugManager available globally");
})();
