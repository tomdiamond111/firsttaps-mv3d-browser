// assets/web/js/threeSetup.js
// Global script version - assumes THREE and CameraControls are loaded globally from CDN
// This file should be loaded after THREE.js and camera-controls are available

// Assuming THREE is globally available from CDN script tag
// Assuming CameraControls is globally available from CDN script tag

CameraControls.install({ THREE });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
window.scene = scene;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
window.camera = camera;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
window.renderer = renderer;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);
directionalLight.castShadow = true;
renderer.shadowMap.enabled = true;

const clock = new THREE.Clock();
window.clock = clock;

const cameraControls = new CameraControls(camera, renderer.domElement);
window.cameraControls = cameraControls;
camera.position.set(0, 5, 10);
cameraControls.setTarget(0, 0, 0, false);
cameraControls.saveState();

cameraControls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
cameraControls.mouseButtons.middle = CameraControls.ACTION.TRUCK; // Pan with middle mouse
cameraControls.mouseButtons.right = CameraControls.ACTION.ROTATE; // Rotate with right mouse

cameraControls.addEventListener('controlstart', () => {
    logToFlutter('CameraControls: controlstart event triggered.');
    // Optional: If an object is not being moved, temporarily disable rotation during pan/zoom.
    // if (cameraControls && !sharedState.selectedObjectForMoveId) {
    //     logToFlutter('CameraControls: Disabling rotation during camera movement (pan/zoom).');
    //     cameraControls.enableRotate = false;
    // }
});

cameraControls.addEventListener('controlend', () => {
    logToFlutter('CameraControls: controlend event triggered.');
    if (cameraControls) {
        if (sharedState.selectedObjectForMoveId) {
            logToFlutter('CameraControls: controlend event, but an object is selected for move. Rotation state managed by move logic (should be false).');
            cameraControls.enableRotate = false; // Ensure it remains false if move is active
        } else {
            logToFlutter('CameraControls: Re-enabling rotation on controlend (no object selected for move).');
            cameraControls.enableRotate = true;
        }
    }
});

const groundLevelY = 0.0;
window.groundLevelY = groundLevelY;
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide, metalness: 0.1, roughness: 0.9 });
const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.position.y = groundLevelY - 0.01;
groundPlane.receiveShadow = true;
scene.add(groundPlane);

function animate(labelObjectsMap, fileObjects) {
    const delta = clock.getDelta();
    const timestamp = performance.now();
    const hasControlsUpdated = cameraControls.update(delta);

    // Update furniture idle animations (when not in playback)
    if (window.app?.furnitureManager?.visualManager?.idleAnimationManager) {
        window.app.furnitureManager.visualManager.idleAnimationManager.updateAllAnimations(
            window.app.furnitureManager.visualManager,
            timestamp
        );
    } else {
        // Debug: Log why animations aren't updating (only once per second to avoid spam)
        if (!window._lastAnimDebugLog || Date.now() - window._lastAnimDebugLog > 1000) {
            console.log('🎨 [DEBUG] Animation manager not available:', {
                hasApp: !!window.app,
                hasFurnitureManager: !!window.app?.furnitureManager,
                hasVisualManager: !!window.app?.furnitureManager?.visualManager,
                hasAnimManager: !!window.app?.furnitureManager?.visualManager?.idleAnimationManager
            });
            window._lastAnimDebugLog = Date.now();
        }
    }

    renderer.render(scene, camera);

    if (hasControlsUpdated) {
        labelObjectsMap.forEach((attachments, uuid) => {
            const object = fileObjects.find(fo => fo.uuid === uuid);
            if (object) {
                if (attachments.infoLabel && attachments.infoLabel.parent === object) {
                    attachments.infoLabel.lookAt(camera.position);
                }
                if (attachments.imagePreview && attachments.imagePreview.parent === object) {
                    attachments.imagePreview.lookAt(camera.position);
                }
            }
        });
    }
    requestAnimationFrame(() => animate(labelObjectsMap, fileObjects));
}
window.animateLoop = animate;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
