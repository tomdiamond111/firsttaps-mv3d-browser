// assets/web/js/objectCreators.js
// Global script version - assumes THREE is available globally

function createCubeMesh(pos, width, height, depth, colorHex, fileName, fileId) {
    // Main button body
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.3, roughness: 0.5 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y + height / 2, pos.z);
    cube.castShadow = true;
    cube.receiveShadow = true;
    // Raised button top (slightly smaller, raised box)
    const topHeight = Math.max(0.2 * height, 0.3);
    const topGeometry = new THREE.BoxGeometry(width * 0.85, topHeight, depth * 0.85);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.3, emissive: colorHex, emissiveIntensity: 0.15 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(0, (height + topHeight) / 2 - topHeight / 2, 0);
    top.castShadow = false;
    top.receiveShadow = false;
    cube.add(top);
    // Outline/glow effect (optional): add a slightly larger transparent box
    const outlineGeometry = new THREE.BoxGeometry(width * 1.1, height * 1.1, depth * 1.1);
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.15 });
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.position.set(0, 0, 0);
    cube.add(outline);
    // Invisible hitbox for easier selection
    const hitboxGeometry = new THREE.BoxGeometry(width * 1.4, height * 1.4, depth * 1.4);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.set(0, 0, 0);
    hitbox.userData.isHitbox = true;
    cube.add(hitbox);
    // User data
    cube.userData = { fileName: fileName, type: 'fileObject', id: fileId };
    return cube;
}

function createCylinderMesh(pos, radius, height, colorHex, fileName, fileId, segments = 24) {
    // Main button body
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    const material = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.3, roughness: 0.5 });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(pos.x, pos.y + height / 2, pos.z);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    // Raised button top (disc)
    const topHeight = Math.max(0.2 * height, 0.3);
    const topGeometry = new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, topHeight, segments);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.3, emissive: colorHex, emissiveIntensity: 0.15 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(0, (height + topHeight) / 2 - topHeight / 2, 0);
    top.castShadow = false;
    top.receiveShadow = false;
    cylinder.add(top);
    // Outline/glow effect (optional): add a slightly larger transparent cylinder
    const outlineGeometry = new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, height * 1.1, segments);
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.15 });
    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
    outline.position.set(0, 0, 0);
    cylinder.add(outline);
    // Invisible hitbox for easier selection
    const hitboxGeometry = new THREE.CylinderGeometry(radius * 1.4, radius * 1.4, height * 1.4, segments);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.set(0, 0, 0);
    hitbox.userData.isHitbox = true;
    cylinder.add(hitbox);
    // User data
    cylinder.userData = { fileName: fileName, type: 'fileObject', id: fileId };
    return cylinder;
}

function createHouse(pos, width, height, colorHex, fileName, fileId) {
    const depth = width * 0.8;
    return createCubeMesh(pos, width, height, depth, colorHex, fileName, fileId);
}

function createBuilding(pos, width, height, colorHex, fileName, fileId) {
    const depth = width * 0.7;
    return createCubeMesh(pos, width, height, depth, colorHex, fileName, fileId);
}

function createSkyscraper(pos, width, height, colorHex, fileName, fileId) {
    const depth = width * 0.6;
    return createCubeMesh(pos, width, height, depth, colorHex, fileName, fileId);
}

function createTower(pos, radius, height, colorHex, fileName, fileId) {
    return createCylinderMesh(pos, radius, height, colorHex, fileName, fileId, 16);
}

// Make functions globally accessible
window.createCubeMesh = createCubeMesh;
window.createCylinderMesh = createCylinderMesh;
window.createHouse = createHouse;
window.createBuilding = createBuilding;
window.createSkyscraper = createSkyscraper;
window.createTower = createTower;
