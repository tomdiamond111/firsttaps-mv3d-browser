// ============================================================================
// GREEN PLANE WORLD TEMPLATE MODULE
// ============================================================================

(function() {
    'use strict';

    /**
     * GreenPlaneWorldTemplate - Landscape-style world with ground plane
     * Extends BaseWorldTemplate to provide a grounded, nature-themed environment
     */
    class GreenPlaneWorldTemplate extends BaseWorldTemplate {
        constructor(THREE, scene, camera, renderer, greenPlaneSize = 300) {
            super(THREE, scene, camera, renderer);
            this.worldType = 'green-plane';
            this.greenPlaneSize = greenPlaneSize;
            this.groundLevelY = 0;
            
            // Store references to environment objects for cleanup
            this.environmentObjects = [];
        }

        // BOUNDARY CLEANUP: Fix legacy objects outside the new boundaries
        cleanupLegacyObjectPositions(allObjects) {
            console.log('=== CLEANING UP LEGACY OBJECT POSITIONS ===');
            const constraints = this.getPositioningConstraints();
            let movedCount = 0;
            let removedCount = 0;
            
            allObjects.forEach(object => {
                if (!object || !object.position) return;
                
                const currentPos = object.position;
                const isOutOfBounds = 
                    currentPos.x < constraints.worldBoundaries.x.min || currentPos.x > constraints.worldBoundaries.x.max ||
                    currentPos.y < constraints.worldBoundaries.y.min || currentPos.y > constraints.worldBoundaries.y.max ||
                    currentPos.z < constraints.worldBoundaries.z.min || currentPos.z > constraints.worldBoundaries.z.max;
                
                if (isOutOfBounds) {
                    console.log(`Object outside boundaries: ${object.userData.fileName} at (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`);
                    
                    // Try to move object to a valid position
                    const newPosition = this.applyPositionConstraints(object, currentPos, allObjects);
                    
                    // Check if the new position is significantly different (indicating successful constraint)
                    const moved = Math.abs(newPosition.x - currentPos.x) > 0.1 || 
                                 Math.abs(newPosition.y - currentPos.y) > 0.1 || 
                                 Math.abs(newPosition.z - currentPos.z) > 0.1;
                    
                    if (moved) {
                        object.position.set(newPosition.x, newPosition.y, newPosition.z);
                        console.log(`✅ Moved ${object.userData.fileName} to valid position (${newPosition.x.toFixed(1)}, ${newPosition.y.toFixed(1)}, ${newPosition.z.toFixed(1)})`);
                        movedCount++;
                    } else {
                        console.log(`❌ Could not find valid position for ${object.userData.fileName} - object may need manual review`);
                    }
                }
            });
            
            console.log(`Green Plane cleanup completed: ${movedCount} objects moved, ${removedCount} objects removed`);
            return { moved: movedCount, removed: removedCount };
        }

        /**
         * PHASE 1: Create enhanced sky with realistic gradient
         * Creates a sky dome with gradient from horizon to zenith for immersive atmosphere
         */
        createEnhancedSky() {
            console.log('🌅 Creating enhanced gradient sky dome...');
            
            // Create sky dome geometry - hemisphere that surrounds the world
            const skyGeometry = new this.THREE.SphereGeometry(500, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
            
            // Create gradient material for realistic sky
            const skyMaterial = new this.THREE.ShaderMaterial({
                uniforms: {
                    topColor: { value: new this.THREE.Color(0x0077be) },    // Deep sky blue at zenith
                    bottomColor: { value: new this.THREE.Color(0x89cdf1) }, // Light blue at horizon
                    offset: { value: 0.02 },
                    exponent: { value: 0.6 }
                },
                vertexShader: `
                    varying vec3 vWorldPosition;
                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPosition.xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 topColor;
                    uniform vec3 bottomColor;
                    uniform float offset;
                    uniform float exponent;
                    varying vec3 vWorldPosition;
                    void main() {
                        float h = normalize(vWorldPosition).y;
                        float ramp = max(offset, pow(max(h, 0.0), exponent));
                        gl_FragColor = vec4(mix(bottomColor, topColor, ramp), 1.0);
                    }
                `,
                side: this.THREE.BackSide // Render inside the dome
            });
            
            // Create and position sky dome
            const skyDome = new this.THREE.Mesh(skyGeometry, skyMaterial);
            skyDome.position.y = 0; // Position at ground level
            this.scene.add(skyDome);
            this.environmentObjects.push(skyDome);
            
            // Set fallback background color (in case sky dome isn't visible)
            this.scene.background = new this.THREE.Color(0x87CEEB);
            
            console.log('✅ Enhanced gradient sky dome created');
        }

        setupEnvironment() {
            console.log('=== SETTING UP GREEN PLANE WORLD (MOBILE OPTIMIZED) ===');
            
            // PHASE 1: Enhanced Sky - Realistic gradient sky dome
            this.createEnhancedSky();
            
            // Ground - green plane with landscape-appropriate settings
            const groundGeometry = new this.THREE.PlaneGeometry(this.greenPlaneSize, this.greenPlaneSize);
            const groundMaterial = new this.THREE.MeshStandardMaterial({ 
                color: 0x228B22, // Forest green
                side: this.THREE.FrontSide, // CRITICAL: Only render front side to prevent seeing underside
                metalness: 0.1, 
                roughness: 0.9 
            });
            const ground = new this.THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = this.groundLevelY - 0.01;
            ground.receiveShadow = true;
            this.scene.add(ground);
            this.environmentObjects.push(ground); // Store for cleanup

            // MOBILE NAVIGATION AIDS: Enhanced grid system for better orientation
            
            // 1. MAIN GRID - Subtle but visible for spatial reference
            const mainGrid = new this.THREE.GridHelper(120, 24, 0x446644, 0x669966);
            mainGrid.material.transparent = true;
            mainGrid.material.opacity = 0.15; // Very subtle
            this.scene.add(mainGrid);
            this.environmentObjects.push(mainGrid);
            
            // 2. CENTER CROSS - Clear origin reference
            const centerSize = 6;
            const centerMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0x44AA44, 
                transparent: true, 
                opacity: 0.6 
            });
            
            // X-axis line (red-ish green)
            const xLineGeometry = new this.THREE.BoxGeometry(centerSize, 0.1, 0.2);
            const xLine = new this.THREE.Mesh(xLineGeometry, centerMaterial);
            xLine.position.set(0, 0.05, 0);
            this.scene.add(xLine);
            this.environmentObjects.push(xLine);
            
            // Z-axis line (blue-ish green)
            const zLineGeometry = new this.THREE.BoxGeometry(0.2, 0.1, centerSize);
            const zLineMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0x4488AA, 
                transparent: true, 
                opacity: 0.6 
            });
            const zLine = new this.THREE.Mesh(zLineGeometry, zLineMaterial);
            zLine.position.set(0, 0.05, 0);
            this.scene.add(zLine);
            this.environmentObjects.push(zLine);
            
            // 3. DISTANCE MARKERS - Help users judge scale and distance
            const markerMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0x66BB66, 
                transparent: true, 
                opacity: 0.4 
            });
            
            const distances = [10, 20, 30]; // Distance markers at 10, 20, 30 units
            distances.forEach(distance => {
                // Corner markers for distance reference
                const positions = [
                    [distance, 0, distance],
                    [-distance, 0, distance],
                    [distance, 0, -distance],
                    [-distance, 0, -distance]
                ];
                
                positions.forEach(([x, y, z]) => {
                    const markerGeometry = new this.THREE.CylinderGeometry(0.3, 0.3, 1, 8);
                    const marker = new this.THREE.Mesh(markerGeometry, markerMaterial);
                    marker.position.set(x, 0.5, z);
                    this.scene.add(marker);
                    this.environmentObjects.push(marker);
                });
            });
            
            // 4. SUBTLE BOUNDARY INDICATORS - Help prevent users from getting too lost
            const boundarySize = 80;
            const boundaryGeometry = new this.THREE.RingGeometry(boundarySize - 2, boundarySize, 0, Math.PI * 2, 32);
            const boundaryMaterial = new this.THREE.MeshBasicMaterial({ 
                color: 0x44AA44, 
                transparent: true, 
                opacity: 0.1,
                side: this.THREE.DoubleSide
            });
            const boundary = new this.THREE.Mesh(boundaryGeometry, boundaryMaterial);
            boundary.rotation.x = -Math.PI / 2;
            boundary.position.y = 0.02;
            this.scene.add(boundary);
            this.environmentObjects.push(boundary);

            console.log('Green plane world environment created with mobile navigation aids');
        }

        applyCameraConstraints(cameraControls) {
            console.log('=== APPLYING GREEN PLANE CAMERA CONSTRAINTS ===');
            
            // LANDSCAPE-STYLE CONSTRAINTS: Much more restrictive for realistic terrain feel
            // Prevent seeing underside completely with tight polar angle limits
            cameraControls.minPolarAngle = Math.PI * 0.05; // 9 degrees from vertical (very steep down look)
            cameraControls.maxPolarAngle = Math.PI * 0.45; // 81 degrees from vertical (almost horizon but not quite)
            
            // Ensure camera stays well above ground level
            cameraControls.minDistance = 3.0;  // Minimum zoom distance
            cameraControls.maxDistance = 200.0; // Maximum zoom distance
            
            console.log('Applied LANDSCAPE-STYLE camera limits for green plane world');
            console.log('Polar angle range: 9° to 81° from vertical (prevents underside view)');
        }

        restrictCameraPosition(camera, cameraControls) {
            if (!camera || !cameraControls) return;
            
            try {
                // MOBILE-FRIENDLY CAMERA GUIDANCE SYSTEM
                
                // 1. HEIGHT CONSTRAINTS - Prevent camera from going below ground
                const minHeight = 1.0; // Minimum height above ground
                if (camera.position.y < minHeight) {
                    camera.position.y = minHeight;
                    cameraControls.update();
                    console.log('Camera height corrected to minimum landscape height:', minHeight);
                }
                
                // 2. ANGLE SAFETY - Prevent extreme viewing angles
                const currentPolarAngle = cameraControls.polarAngle;
                const maxAllowedPolar = Math.PI * 0.45; // 81 degrees
                if (currentPolarAngle > maxAllowedPolar) {
                    // Gentle correction instead of harsh snap
                    const safeDistance = cameraControls.distance;
                    const safeHeight = Math.max(minHeight, safeDistance * Math.cos(maxAllowedPolar * 0.9));
                    camera.position.y = safeHeight;
                    cameraControls.update();
                    console.log('Camera angle gently corrected to prevent underside view');
                }
                
                // 3. DISTANCE FROM CENTER - Gentle guidance to keep users oriented
                const centerDistance = Math.sqrt(
                    camera.position.x * camera.position.x + 
                    camera.position.z * camera.position.z
                );
                
                const softBoundary = 100;  // Start gentle nudging at this distance
                const hardBoundary = 120;  // Force correction at this distance
                
                if (centerDistance > hardBoundary) {
                    // HARD BOUNDARY: Move camera back within limits
                    const scale = hardBoundary / centerDistance;
                    camera.position.x *= scale;
                    camera.position.z *= scale;
                    cameraControls.update();
                    console.log('Camera position corrected - was too far from center');
                } else if (centerDistance > softBoundary) {
                    // SOFT BOUNDARY: Gentle nudge towards center (mobile-friendly)
                    const nudgeFactor = 0.98; // Very gentle nudge
                    camera.position.x *= nudgeFactor;
                    camera.position.z *= nudgeFactor;
                    // No forced update - let natural camera movement handle it
                }
                
                // 4. AUTO-RECOVERY FOR LOST USERS - If user gets in a bad position
                const badPosition = (
                    camera.position.y < 2 && 
                    cameraControls.distance > 50 && 
                    currentPolarAngle > Math.PI * 0.4
                );
                
                if (badPosition) {
                    // Very gentle guidance back to a better view
                    const currentTarget = cameraControls.getTarget();
                    const distanceToCenter = Math.sqrt(
                        currentTarget.x * currentTarget.x + 
                        currentTarget.z * currentTarget.z
                    );
                    
                    if (distanceToCenter > 20) {
                        // Gently pull target towards center
                        currentTarget.x *= 0.99;
                        currentTarget.z *= 0.99;
                        cameraControls.setTarget(currentTarget.x, currentTarget.y, currentTarget.z, false);
                    }
                }
                
            } catch (error) {
                console.error('Error in mobile camera guidance system:', error);
            }
        }

        getHomeViewPosition() {
            // Optimized view of demo Gallery Wall at z: -15 - adjust based on screen orientation
            const aspectRatio = window.innerWidth / window.innerHeight;
            const isLandscape = aspectRatio > 1.2;
            
            if (isLandscape) {
                return { x: 0, y: 1, z: -13 }; // Landscape: Close and eye-level
            } else {
                return { x: 0, y: 10, z: 10 }; // Portrait: Further back and higher
            }
        }

        getHomeViewTarget() {
            return { x: 0, y: 5, z: -15 }; // Look at center of Gallery Wall
        }

        getMaxZoomDistance() {
            return 200.0; // Same as maxDistance in applyCameraConstraints
        }

        getPositioningConstraints() {
            return {
                requiresSupport: true,  // Objects must sit on plane or other objects
                allowedStackingDirections: ['top'], // Only stack on top
                worldBoundaries: {
                    x: { min: -this.greenPlaneSize/2, max: this.greenPlaneSize/2 },  // ±150 for greenPlaneSize=300
                    y: { min: 0, max: this.greenPlaneSize/2 },  // 0 to 150 (reasonable stacking limit)
                    z: { min: -this.greenPlaneSize/2, max: this.greenPlaneSize/2 }   // ±150 for greenPlaneSize=300
                }
            };
        }

        applyPositionConstraints(object, newPosition, allObjects = []) {
            const constraints = this.getPositioningConstraints();
            
            // Apply world boundaries first
            let constrainedX = Math.max(constraints.worldBoundaries.x.min, Math.min(constraints.worldBoundaries.x.max, newPosition.x));
            let constrainedZ = Math.max(constraints.worldBoundaries.z.min, Math.min(constraints.worldBoundaries.z.max, newPosition.z));
            
            // Get object height dynamically using bounding box for accurate positioning
            let objectHeight;
            try {
                // Calculate bounding box to get actual height
                if (!object.geometry.boundingBox) {
                    object.geometry.computeBoundingBox();
                }
                const box = object.geometry.boundingBox;
                objectHeight = box ? (box.max.y - box.min.y) : 1;
                console.log(`Dynamic height for ${object.userData.fileName || object.userData.id || 'unknown'}: ${objectHeight}`);
            } catch (error) {
                // Fallback to geometry parameters if bounding box fails
                objectHeight = object.geometry?.parameters?.height || 1;
                console.log(`Fallback height for ${object.userData.fileName || object.userData.id || 'unknown'}: ${objectHeight}`);
            }
            let constrainedY = this.groundLevelY + objectHeight / 2; // Position so object bottom sits on ground
            
            // GREEN PLANE WORLD: Objects must be supported - check for objects below
            if (constraints.requiresSupport && allObjects.length > 0) {
                const otherObjects = allObjects.filter(obj => obj !== object);
                let supportObject = null;
                let maxSupportHeight = this.groundLevelY + objectHeight / 2; // Ground level + object center height
                
                // Find the highest object that can support this object at the constrained position
                for (const otherObj of otherObjects) {
                    const otherHalfWidth = (otherObj.geometry?.parameters?.width || otherObj.geometry?.parameters?.radius * 2 || 1) / 2;
                    const otherHalfDepth = (otherObj.geometry?.parameters?.depth || otherObj.geometry?.parameters?.radius * 2 || 1) / 2;
                    
                    // Check if the object is close enough to provide support
                    if (Math.abs(constrainedX - otherObj.position.x) < otherHalfWidth && 
                        Math.abs(constrainedZ - otherObj.position.z) < otherHalfDepth) {
                        const otherHeight = otherObj.geometry?.parameters?.height || 1;
                        // Calculate support height: top of supporting object + half height of object being placed
                        const supportHeight = otherObj.position.y + otherHeight / 2 + objectHeight / 2;
                        
                        if (supportHeight > maxSupportHeight) {
                            maxSupportHeight = supportHeight;
                            supportObject = otherObj;
                        }
                    }
                }
                
                // If we found a supporting object, snap to its position and place on top
                if (supportObject) {
                    constrainedX = supportObject.position.x;
                    constrainedZ = supportObject.position.z;
                    constrainedY = maxSupportHeight;
                } else {
                    // No support found, place on ground (already set above)
                    constrainedY = this.groundLevelY + objectHeight / 2;
                }
            }
            
            return {
                x: constrainedX,
                y: constrainedY,
                z: constrainedZ
            };
        }

        cleanupEnvironment() {
            console.log('=== CLEANING UP GREEN PLANE WORLD ===');
            
            // PROTECTION: Only clean up if this is a legitimate disposal (world switch)
            // Skip cleanup if it's being called inappropriately during avatar customization
            if (this.isInappropriateCleanup()) {
                console.warn('⚠️ Preventing inappropriate green plane cleanup during avatar customization');
                return;
            }
            
            // Remove all environment objects from scene
            this.environmentObjects.forEach(obj => {
                if (obj && this.scene && obj.parent === this.scene) {
                    this.scene.remove(obj);
                    
                    // Dispose of geometry and material to free memory
                    if (obj.geometry) {
                        obj.geometry.dispose();
                    }
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(material => material.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                }
            });
            
            // Clear the environment objects array
            this.environmentObjects = [];
            console.log('Green plane world environment cleanup completed');
        }

        /**
         * Check if cleanup is being called inappropriately during avatar operations
         */
        isInappropriateCleanup() {
            // Check if we're in the middle of avatar customization
            const hasActiveCustomization = (
                window.ContactCustomizationManager?.instance?.currentContactId ||
                window.ExploreAvatarCustomizationManager?.instance?.isActive ||
                document.querySelector('#avatarCustomizationModal')?.style?.display !== 'none'
            );
            
            // Check if it's been less than 5 seconds since last avatar update
            const now = Date.now();
            const recentAvatarUpdate = (
                window.lastAvatarConfigUpdate && 
                (now - window.lastAvatarConfigUpdate) < 5000
            );
            
            return hasActiveCustomization || recentAvatarUpdate;
        }

        needsObjectTransformation(object, fromWorldType) {
            // Transform objects when entering green plane world from 3D worlds (space/ocean)
            return fromWorldType === 'space' || fromWorldType === 'ocean';
        }

        transformObjectToWorld(object, fromWorldType) {
            console.log(`=== TRANSFORMING OBJECT TO GREEN PLANE WORLD ===`);
            console.log(`Object: ${object.userData.fileName}, From: ${fromWorldType}`);
            
            try {
                // CRITICAL: Convert 3D positioned objects to ground-based stacking
                if (fromWorldType === 'space' || fromWorldType === 'ocean') {
                    this.convertFrom3DToGroundBased(object);
                }
                
                // Apply green plane aesthetic (restore natural colors)
                this.applyGreenPlaneAesthetic(object);
                
                console.log(`Successfully transformed ${object.userData.fileName} to green plane world`);
                return true;
            } catch (error) {
                console.error(`Error transforming object ${object.userData.fileName} to green plane world:`, error);
                return false;
            }
        }

        convertFrom3DToGroundBased(object) {
            console.log(`Converting 3D object ${object.userData.fileName} to ground-based positioning`);
            console.log(`Current position:`, { x: object.position.x, y: object.position.y, z: object.position.z });
            
            // Check if this object was floating in 3D space (not on ground level)
            const objectHeight = object.geometry?.parameters?.height || 1;
            const groundPosition = this.groundLevelY + objectHeight / 2;
            const isFloating = Math.abs(object.position.y - groundPosition) > 0.5; // tolerance of 0.5 units
            
            if (isFloating) {
                console.log(`Object was floating at Y=${object.position.y}, converting to stacked positioning...`);
                
                // Find all objects at similar XZ position that could be stacked
                const allObjects = this.scene.children.filter(child => 
                    child.userData && child.userData.type === 'fileObject' && child !== object
                );
                
                const tolerance = 2.0; // How close objects need to be to be considered "aligned"
                const alignedObjects = allObjects.filter(other => {
                    const dx = Math.abs(object.position.x - other.position.x);
                    const dz = Math.abs(object.position.z - other.position.z);
                    return dx < tolerance && dz < tolerance;
                });
                
                if (alignedObjects.length > 0) {
                    // Sort aligned objects by Y position (lowest to highest)
                    alignedObjects.sort((a, b) => a.position.y - b.position.y);
                    
                    // Position this object in the stack based on its original Y position
                    let stackPosition = 0; // Start at ground level
                    let targetX = object.position.x;
                    let targetZ = object.position.z;
                    
                    // Find where in the stack this object should go based on its Y position
                    for (const other of alignedObjects) {
                        if (object.position.y > other.position.y) {
                            // This object should be above the other
                            const otherHeight = other.geometry?.parameters?.height || 1;
                            stackPosition = Math.max(stackPosition, other.position.y + otherHeight / 2 + objectHeight / 2);
                            targetX = other.position.x; // Align X position
                            targetZ = other.position.z; // Align Z position
                        }
                    }
                    
                    // If no objects were found below, place on ground but align with the first object
                    if (stackPosition === 0 && alignedObjects.length > 0) {
                        stackPosition = groundPosition;
                        targetX = alignedObjects[0].position.x;
                        targetZ = alignedObjects[0].position.z;
                    }
                    
                    console.log(`Stacking object at position:`, { x: targetX, y: stackPosition, z: targetZ });
                    object.position.set(targetX, stackPosition, targetZ);
                } else {
                    // No aligned objects, just place on ground at current XZ position
                    console.log(`No aligned objects found, placing on ground at XZ position`);
                    object.position.y = groundPosition;
                }
            } else {
                console.log(`Object was already at ground level, no conversion needed`);
            }
        }

        applyGreenPlaneAesthetic(object) {
            // Restore natural material appearance (undo space/ocean effects)
            const originalColor = object.userData.originalBaseColor || 0x888888;
            
            if (Array.isArray(object.material)) {
                // Handle multi-material objects (preserve face textures)
                object.material = object.material.map((mat, index) => {
                    const newMat = mat.clone();
                    
                    // Only modify non-textured faces
                    if (!newMat.map) {
                        newMat.color.setHex(originalColor);
                        newMat.emissive.setHex(0x000000); // Remove glow
                        newMat.metalness = 0.3; // Restore natural metalness
                        newMat.roughness = 0.6; // Restore natural roughness
                    }
                    
                    return newMat;
                });
            } else {
                // Single material
                const newMaterial = object.material.clone();
                newMaterial.color.setHex(originalColor);
                newMaterial.emissive.setHex(0x000000); // Remove glow
                newMaterial.metalness = 0.3; // Restore natural metalness
                newMaterial.roughness = 0.6; // Restore natural roughness
                object.material = newMaterial;
            }
        }

        dispose() {
            console.log('Disposing green plane world template');
            this.cleanupEnvironment();
        }
    }

    // Export to global scope
    window.GreenPlaneWorldTemplate = GreenPlaneWorldTemplate;
    
    console.log('GreenPlaneWorldTemplate module loaded');

})();
