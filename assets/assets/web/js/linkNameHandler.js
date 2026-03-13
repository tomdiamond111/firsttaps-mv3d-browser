// linkNameHandler.js

// Handles the logic for updating link names in the 3D scene
// Updated to use the new LinkNameManager for improved thumbnail detection and persistence

const linkNameHandler = {
  /**
   * Update the name of a link object in the scene.
   *
   * @param {string} objectId - The UUID of the link object.
   * @param {string} newName - The new name for the link.
   */
  updateLinkName: (objectId, newName) => {
    console.log(`🔗 linkNameHandler: Attempting to update name for ${objectId} to "${newName}"`);
    
    // Use the new LinkNameManager if available
    if (window.LinkNameManager) {
      try {
        const linkNameManager = new window.LinkNameManager();
        const success = linkNameManager.updateLinkName(objectId, newName);
        
        if (success) {
          console.log(`✅ linkNameHandler: Successfully updated link name using LinkNameManager`);
        } else {
          console.error(`❌ linkNameHandler: Failed to update link name using LinkNameManager`);
        }
        
        return success;
      } catch (error) {
        console.error('❌ linkNameHandler: Error using LinkNameManager:', error);
        // Fall back to legacy implementation
      }
    }
    
    // Legacy implementation as fallback
    console.log('⚠️ linkNameHandler: Using legacy implementation as fallback');
    return linkNameHandler._legacyUpdateLinkName(objectId, newName);
  },

  /**
   * Legacy implementation for backward compatibility
   */
  _legacyUpdateLinkName: (objectId, newName) => {
    if (!window.scene) {
      console.error('Scene not found.');
      return false;
    }

    const object = window.scene.getObjectByProperty('uuid', objectId);

    if (object) {
      console.log('Found object:', object);

      // Ensure it's a link object
      if (object.userData && object.userData.mimeType && object.userData.mimeType.startsWith('link:')) {
        
        // Persist the new name
        if (window.linkNamePersistence) {
          window.linkNamePersistence.setCustomName(objectId, newName);
        }

        // Re-apply the original logo with the new custom name
        if (window.app && window.app.linkVisualManager) {
          // Get the stored enhancement data to retrieve the original logo and category
          const enhancement = object.userData.visualEnhancement;
          if (enhancement && enhancement.category) {
            // Get the original domain to find the logo text
            const linkData = enhancement.linkData;
            let logoText = 'LINK'; // fallback
            
            if (linkData && linkData.url) {
              try {
                const domain = new URL(linkData.url).hostname.toLowerCase().replace('www.', '');
                
                // Check if there's a pre-built logo for this domain
                if (window.app.linkVisualManager.preBuiltLogos && window.app.linkVisualManager.preBuiltLogos[domain]) {
                  logoText = window.app.linkVisualManager.preBuiltLogos[domain];
                } else {
                  // Use category-based fallback
                  const categoryIcons = {
                    'social': 'SOC',
                    'shopping': 'SHOP', 
                    'news': 'NEWS',
                    'tech': 'TECH',
                    'video': 'VID',
                    'entertainment': 'ENT',
                    'education': 'EDU',
                    'business': 'BIZ',
                    'government': 'GOV',
                    'general': 'LINK'
                  };
                  logoText = categoryIcons[enhancement.category] || 'LINK';
                }
                
                // Re-apply the logo with the new custom name
                window.app.linkVisualManager.applyTextLogo(object, logoText, enhancement.category, domain);
                console.log(`Successfully updated link texture for ${objectId} with new name "${newName}" using logo "${logoText}" and category "${enhancement.category}"`);
              } catch (error) {
                console.error('Error parsing URL for texture update:', error);
                // Fallback: just re-apply with general category
                window.app.linkVisualManager.applyTextLogo(object, 'LINK', 'general');
              }
            } else {
              // Fallback: just re-apply with stored category
              window.app.linkVisualManager.applyTextLogo(object, 'LINK', enhancement.category);
            }
          } else {
            console.error('No enhancement data found for link object - cannot update texture');
          }
        } else {
          console.error('app.linkVisualManager not available. Available:', {
            'window.app': !!window.app,
            'window.app.linkVisualManager': !!(window.app && window.app.linkVisualManager)
          });
        }
        
        // Force camera reset to prevent freeze
        if (window.forceCameraReset) {
          setTimeout(() => {
            window.forceCameraReset();
            console.log('Camera reset called after name update');
          }, 200); // Small delay to ensure texture update completes first
        } else {
          console.warn('forceCameraReset function not available');
        }
        
        return true;
      } else {
        console.error('Object is not a link object.');
        return false;
      }
    } else {
      console.error(`Object with ID ${objectId} not found in the scene.`);
      return false;
    }
  }
};

// Expose the handler to the global window object
window.linkNameHandler = linkNameHandler;
