// modules/objects/objectPositioning.js
// Dependencies: None (Pure utility functions)
// Exports: window.ObjectPositioner

(function() {
    'use strict';
    
    console.log("Loading ObjectPositioner module...");
    
    // ============================================================================
    // OBJECT POSITIONING AND ARRANGEMENT
    // ============================================================================
    class ObjectPositioner {
        constructor() {
            this.objectSpacing = 3.0;
            this.gridSize = 2.0;
        }

        calculateOptimalPosition(existingObjects, newObject) {
            if (existingObjects.length === 0) {
                return { x: 0, y: 0, z: 0 };
            }

            // Get used positions
            const usedPositions = existingObjects.map(obj => ({
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z
            }));

            // Try positions in a spiral pattern
            for (let radius = 1; radius <= 10; radius++) {
                for (let angle = 0; angle < 360; angle += 45) {
                    const radians = (angle * Math.PI) / 180;
                    const x = radius * this.objectSpacing * Math.cos(radians);
                    const z = radius * this.objectSpacing * Math.sin(radians);
                    
                    const candidate = { x, y: 0, z };
                    
                    if (!this.isPositionOccupied(candidate, usedPositions)) {
                        return candidate;
                    }
                }
            }

            // Fallback to a random position
            return {
                x: (Math.random() - 0.5) * 20,
                y: 0,
                z: (Math.random() - 0.5) * 20
            };
        }

        isPositionOccupied(candidate, usedPositions) {
            const tolerance = this.objectSpacing * 0.8;
            
            return usedPositions.some(pos =>
                Math.abs(pos.x - candidate.x) < tolerance &&
                Math.abs(pos.z - candidate.z) < tolerance
            );
        }

        arrangeObjectsInGrid(objects) {
            const gridSize = Math.ceil(Math.sqrt(objects.length));
            
            objects.forEach((object, index) => {
                const row = Math.floor(index / gridSize);
                const col = index % gridSize;
                
                const x = (col - gridSize / 2) * this.objectSpacing;
                const z = (row - gridSize / 2) * this.objectSpacing;
                
                object.position.set(x, object.position.y, z);
            });
        }

        arrangeObjectsInCircle(objects) {
            const radius = objects.length * this.objectSpacing / (2 * Math.PI);
            
            objects.forEach((object, index) => {
                const angle = (2 * Math.PI * index) / objects.length;
                const x = radius * Math.cos(angle);
                const z = radius * Math.sin(angle);
                
                object.position.set(x, object.position.y, z);
            });
        }

        arrangeObjectsInSpiral(objects) {
            objects.forEach((object, index) => {
                const angle = index * 0.5;
                const radius = index * 0.5 * this.objectSpacing;
                const x = radius * Math.cos(angle);
                const z = radius * Math.sin(angle);
                
                object.position.set(x, object.position.y, z);
            });
        }
    }

    // Make globally accessible
    window.ObjectPositioner = ObjectPositioner;
    
    console.log("ObjectPositioner module loaded successfully");
})();
