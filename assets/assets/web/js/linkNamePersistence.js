// linkNamePersistence.js

// Manages persistence of custom link names using localStorage.

const LinkNamePersistence = {
  // Store a custom name for a given link object ID
  setCustomName: (objectId, customName) => {
    try {
      localStorage.setItem(`custom_link_name_${objectId}`, customName);
      console.log(`Saved custom name for ${objectId}: ${customName}`);
    } catch (error) {
      console.error('Error saving custom link name to localStorage:', error);
    }
  },

  // Retrieve the custom name for a given link object ID
  getCustomName: (objectId) => {
    try {
      const customName = localStorage.getItem(`custom_link_name_${objectId}`);
      // console.log(`Retrieved custom name for ${objectId}: ${customName}`);
      return customName;
    } catch (error) {
      console.error('Error retrieving custom link name from localStorage:', error);
      return null;
    }
  },

  // Remove the custom name for a given link object ID
  removeCustomName: (objectId) => {
    try {
      localStorage.removeItem(`custom_link_name_${objectId}`);
      console.log(`Removed custom name for ${objectId}`);
    } catch (error) {
      console.error('Error removing custom link name from localStorage:', error);
    }
  },

  // Apply all stored custom names to the scene
  applyAllCustomNames: (scene) => {
    console.log('Applying all custom link names from localStorage...');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('custom_link_name_')) {
        const objectId = key.replace('custom_link_name_', '');
        const customName = localStorage.getItem(key);
        
        const object = scene.getObjectByProperty('uuid', objectId);
        if (object && object.userData && object.userData.mimeType && object.userData.mimeType.startsWith('link:')) {
          // Find the text sprite child and update its text
          const textSprite = object.children.find(child => child.isSprite);
          if (textSprite && textSprite.material.map.image) {
            const newTexture = createTextTexture(customName, textSprite.material.map.font);
            textSprite.material.map = newTexture;
            textSprite.material.needsUpdate = true;
            console.log(`Applied custom name "${customName}" to ${objectId}`);
          }
        }
      }
    }
  }
};

// Expose to the global scope
window.linkNamePersistence = LinkNamePersistence;
