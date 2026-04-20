// threejs_world_init.js
// All 3D world and camera initialization logic is protected here.
// Only expose high-level functions for use by bundle.js or Dart interop.

let scene, camera, renderer, controls;

function initializeScene(options = {}) {
    // Basic Three.js scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        options.fov || 60,
        window.innerWidth / window.innerHeight,
        options.near || 0.1,
        options.far || 1000
    );
    camera.position.set(0, 10, 25);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Camera controls
    controls = new CameraControls(camera, renderer.domElement);
    controls.dollyToCursor = true;

    // Example: add a grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7.5);
    scene.add(light);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function resetCamera() {
    if (camera && controls) {
        camera.position.set(0, 10, 25);
        camera.lookAt(0, 0, 10);
        controls.setLookAt(0, 10, 25, 0, 0, 10, true);
    }
}

function switchWorld(worldType) {
    // Remove all objects except camera, lights, and grid
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    // Add world template objects based on worldType
    if (worldType === 'green-plane') {
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 0x00ff00 })
        );
        plane.rotation.x = -Math.PI / 2;
        scene.add(plane);
    } else if (worldType === 'space') {
        scene.background = new THREE.Color(0x000011);
    } else if (worldType === 'ocean') {
        scene.background = new THREE.Color(0x2266cc);
    }
    // Add grid and light again
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7.5);
    scene.add(light);
}

// --- STACKING RELATIONSHIP PERSISTENCE AND RESTORATION ---
// 1. When stacking, set stackedOnId
function stackObjectOnTarget(movingObject, targetObject) {
    if (movingObject && targetObject) {
        movingObject.userData.stackedOnId = targetObject.userData.id;
        // Position movingObject exactly on top of targetObject
        const targetHeight = targetObject.geometry.parameters.height || 2;
        const movingHeight = movingObject.geometry.parameters.height || 2;
        movingObject.position.x = targetObject.position.x;
        movingObject.position.z = targetObject.position.z;
        movingObject.position.y = targetObject.position.y + targetHeight / 2 + movingHeight / 2;
    }
}

// --- GRID OCCUPANCY CHECK ---
function isGridOccupied(x, z, objects, excludeId = null) {
    // Returns true if any object (except excludeId) occupies the same grid square (rounded to int)
    return objects.some(obj => {
        if (!obj.position) return false;
        if (excludeId && obj.userData && obj.userData.id === excludeId) return false;
        return Math.round(obj.position.x) === Math.round(x) && Math.round(obj.position.z) === Math.round(z);
    });
}

// --- ENHANCED RESTORATION WITH GRID CHECK AND DEBUG LOGGING ---
function restoreObjectsWithStacking(objectsData, createObjectFn) {
    const baseObjects = objectsData.filter(obj => !obj.userData?.stackedOnId);
    const stackedObjects = objectsData.filter(obj => obj.userData?.stackedOnId);
    const createdObjects = {};
    // Restore base objects
    baseObjects.forEach(data => {
        const obj = createObjectFn(data);
        if (obj && obj.userData && obj.userData.id) {
            // Check for grid occupancy
            if (isGridOccupied(obj.position.x, obj.position.z, Object.values(createdObjects), obj.userData.id)) {
                console.warn('Grid square already occupied at', obj.position.x, obj.position.z, 'for object', obj.userData.id);
                // Optionally, offset or skip placement
            }
            createdObjects[obj.userData.id] = obj;
        }
    });
    // Restore stacked objects
    stackedObjects.forEach(data => {
        const baseId = data.userData.stackedOnId;
        const baseObj = createdObjects[baseId];
        const obj = createObjectFn(data);
        if (obj && baseObj) {
            stackObjectOnTarget(obj, baseObj);
            // Debug log
            console.log('Stacked object', obj.userData.id, 'on', baseId, 'at', obj.position);
        } else if (obj) {
            // If base missing, fallback to grid check
            if (isGridOccupied(obj.position.x, obj.position.z, Object.values(createdObjects), obj.userData.id)) {
                console.warn('Stacked object', obj.userData.id, 'could not find base, grid occupied at', obj.position.x, obj.position.z);
            }
        }
        if (obj && obj.userData && obj.userData.id) {
            createdObjects[obj.userData.id] = obj;
        }
    });
    return createdObjects;
}

// 3. Update snapObjectToContact to use stackedOnId if present
function snapObjectToContactWithStackedId(movingObject, stateManager) {
    if (movingObject.userData && movingObject.userData.stackedOnId && stateManager && stateManager.fileObjects) {
        const baseObj = stateManager.fileObjects.find(obj => obj.userData.id === movingObject.userData.stackedOnId);
        if (baseObj) {
            stackObjectOnTarget(movingObject, baseObj);
            return;
        }
    }
    // Fallback to original snap logic if no stackedOnId
    if (typeof snapObjectToContact === 'function') {
        snapObjectToContact(movingObject, stateManager);
    }
}

// Expose only the main functions globally
window.initializeScene = initializeScene;
window.resetCamera = resetCamera;
window.switchWorld = switchWorld;
// Expose stacking helpers for use in main app logic
window.stackObjectOnTarget = stackObjectOnTarget;
window.restoreObjectsWithStacking = restoreObjectsWithStacking;
window.snapObjectToContactWithStackedId = snapObjectToContactWithStackedId;
