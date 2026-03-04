/**
 * Recommendation Badge System for 3D Furniture
 * Adds visual "Recommendations" badges to furniture in the 3D world
 */

class RecommendationBadgeManager {
  constructor() {
    this.badgeCache = new Map();
  }

  /**
   * Create a text texture for the badge
   */
  createTextTexture(text, options = {}) {
    const fontSize = options.fontSize || 48;
    const fontColor = options.fontColor || '#FFD700'; // Gold
    const backgroundColor = options.backgroundColor || '#000000';
    const padding = options.padding || 10;

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set font
    context.font = `bold ${fontSize}px Arial`;
    const metrics = context.measureText(text);
    const textWidth = metrics.width;

    // Set canvas size
    canvas.width = textWidth + (padding * 2);
    canvas.height = fontSize + (padding * 2);

    // Draw background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    context.font = `bold ${fontSize}px Arial`;
    context.fillStyle = fontColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Add a "Recommendations" badge to a furniture group
   */
  addRecommendationBadge(furnitureGroup, furnitureType) {
    try {
      // Check if badge already exists
      const existingBadge = furnitureGroup.getObjectByName('recommendationBadge');
      if (existingBadge) {
        console.log('[RecommendationBadge] Badge already exists for', furnitureType);
        return;
      }

      // Create badge geometry
      const badgeWidth = 2;
      const badgeHeight = 0.5;
      const badgeGeometry = new THREE.PlaneGeometry(badgeWidth, badgeHeight);

      // Create badge texture
      const badgeTexture = this.createTextTexture('Recommendations', {
        fontSize: 48,
        fontColor: '#FFD700', // Gold
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10
      });

      // Create badge material
      const badgeMaterial = new THREE.MeshBasicMaterial({
        map: badgeTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      // Create badge mesh
      const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
      badge.name = 'recommendationBadge';

      // Position badge on top of furniture
      const bbox = new THREE.Box3().setFromObject(furnitureGroup);
      const furnitureHeight = bbox.max.y - bbox.min.y;
      
      badge.position.y = bbox.max.y + 0.3; // Slightly above furniture
      badge.position.x = 0;
      badge.position.z = 0;

      // Rotate to face upward
      badge.rotation.x = -Math.PI / 2;

      // Add glow effect
      this.addBadgeGlow(badge);

      // Add to furniture group
      furnitureGroup.add(badge);

      // Cache for later removal
      this.badgeCache.set(furnitureGroup.uuid, badge);

      console.log('[RecommendationBadge] Added badge to', furnitureType);
    } catch (error) {
      console.error('[RecommendationBadge] Error adding badge:', error);
    }
  }

  /**
   * Add a subtle glow effect to the badge
   */
  addBadgeGlow(badge) {
    try {
      // Create glow geometry (slightly larger)
      const glowGeometry = new THREE.PlaneGeometry(2.2, 0.6);
      
      // Create glow material
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700, // Gold
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      // Create glow mesh
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.name = 'recommendationBadgeGlow';
      glow.position.z = -0.01; // Slightly behind badge

      // Add to badge
      badge.add(glow);

      // Animate glow (pulse effect)
      this.animateGlow(glow);
    } catch (error) {
      console.error('[RecommendationBadge] Error adding glow:', error);
    }
  }

  /**
   * Animate the glow with a pulsing effect
   */
  animateGlow(glow) {
    let pulseDirection = 1;
    let pulseOpacity = 0.2;

    const animate = () => {
      if (!glow.parent) return; // Stop if removed

      // Pulse opacity
      pulseOpacity += 0.005 * pulseDirection;
      
      if (pulseOpacity >= 0.3) {
        pulseDirection = -1;
      } else if (pulseOpacity <= 0.1) {
        pulseDirection = 1;
      }

      glow.material.opacity = pulseOpacity;

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Remove badge from furniture
   */
  removeBadge(furnitureGroup) {
    try {
      const badge = furnitureGroup.getObjectByName('recommendationBadge');
      if (badge) {
        furnitureGroup.remove(badge);
        badge.geometry.dispose();
        badge.material.map.dispose();
        badge.material.dispose();
        this.badgeCache.delete(furnitureGroup.uuid);
        console.log('[RecommendationBadge] Removed badge from furniture');
      }
    } catch (error) {
      console.error('[RecommendationBadge] Error removing badge:', error);
    }
  }

  /**
   * Update badge visibility based on camera distance
   */
  updateBadgeVisibility(furnitureGroup, camera) {
    try {
      const badge = furnitureGroup.getObjectByName('recommendationBadge');
      if (!badge) return;

      // Calculate distance from camera to furniture
      const distance = camera.position.distanceTo(furnitureGroup.position);

      // Fade out badge when too far or too close
      const minDistance = 5;
      const maxDistance = 30;

      if (distance < minDistance || distance > maxDistance) {
        badge.material.opacity = Math.max(0, badge.material.opacity - 0.05);
      } else {
        badge.material.opacity = Math.min(0.9, badge.material.opacity + 0.05);
      }
    } catch (error) {
      console.error('[RecommendationBadge] Error updating visibility:', error);
    }
  }

  /**
   * Make badge face the camera (billboard effect)
   */
  updateBadgeOrientation(furnitureGroup, camera) {
    try {
      const badge = furnitureGroup.getObjectByName('recommendationBadge');
      if (!badge) return;

      // Keep badge horizontal but rotate to face camera on Y axis
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
      badge.rotation.z = angle;
    } catch (error) {
      console.error('[RecommendationBadge] Error updating orientation:', error);
    }
  }

  /**
   * Clean up all badges
   */
  dispose() {
    this.badgeCache.forEach((badge, uuid) => {
      if (badge.parent) {
        badge.parent.remove(badge);
      }
      badge.geometry.dispose();
      badge.material.map.dispose();
      badge.material.dispose();
    });
    this.badgeCache.clear();
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecommendationBadgeManager;
}

// Global instance
window.recommendationBadgeManager = new RecommendationBadgeManager();

console.log('[RecommendationBadge] Badge manager initialized');
