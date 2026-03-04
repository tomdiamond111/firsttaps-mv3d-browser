/**
 * LEVEL REGISTRATION HELPER
 * Utilities to make registering new levels straightforward
 * Handles the integration points in SVGEntityManager automatically
 */

class LevelRegistrationHelper {
    
    /**
     * Generate the code needed to add a new level to SVGEntityManager
     * Returns code snippets that can be copied into the appropriate sections
     */
    static generateLevelIntegrationCode(config) {
        const {
            levelNumber,
            entityNames, // Array of 5 entity class names
            pointThreshold,
            entityTypes, // Array of entity type strings (e.g., ['entity1', 'entity2', ...])
            pointValues // Array of point values [800, 900, 1000, 1100, 1200]
        } = config;
        
        console.log(`🎮 Generating integration code for Level ${levelNumber}`);
        
        return {
            // For verifyLevelEntities method
            verifyLevelEntitiesCode: `            ${levelNumber}: ['${entityNames.join("', '")}'],`,
            
            // For loadEntityCollectionForLevel method
            loadEntityCollectionCode: `                case ${levelNumber}:
                    // Check if Level ${levelNumber} premium entities are available from bundle
                    available = ${entityNames.map(name => `window.${name}`).join(' && \n                               ')};
                    break;`,
            
            // For spawnLevelEntity method
            spawnLevelEntityCode: this.generateSpawnEntityCode(levelNumber, entityTypes, entityNames),
            
            // For getEntityCollectionForLevel method
            entityCollectionCode: this.generateEntityCollectionCode(levelNumber, entityTypes, pointValues),
            
            // For levelThresholds
            levelThresholdCode: `            ${levelNumber}: ${pointThreshold},   // Level ${levelNumber}: Premium (${pointThreshold/1000}k+ points + PREMIUM)`
        };
    }
    
    /**
     * Generate spawn entity switch cases
     */
    static generateSpawnEntityCode(levelNumber, entityTypes, entityNames) {
        const cases = entityTypes.map((type, index) => {
            const entityName = entityNames[index];
            return `                case '${type}':
                    if (window.${entityName}) {
                        entityInstance = new window.${entityName}(this.scene);
                        // console.log(\`🎮 Level ${levelNumber} ${type} entity created successfully\`);
                    } else {
                        console.warn(\`⚠️ ${entityName} not available for spawning\`);
                    }
                    break;`;
        }).join('\n');
        
        return `        // Level ${levelNumber} entities (Premium)
        else if (level === ${levelNumber}) {
            // console.log(\`🎮 Level ${levelNumber}: Attempting to spawn premium \${entityType}...\`);
            switch (entityType) {
${cases}
            }
        }`;
    }
    
    /**
     * Generate entity collection weights
     */
    static generateEntityCollectionCode(levelNumber, entityTypes, pointValues) {
        const entities = entityTypes.map((type, index) => {
            return `                { type: '${type}', weight: ${5 - index} }`; // Higher weight for earlier entities
        }).join(',\n');
        
        return `            case ${levelNumber}:
                if (!this.isPremiumLevelUnlocked(${levelNumber})) {
                    console.log(\`🎮 Level ${levelNumber} premium entities not unlocked, using Level \${this.currentLevel - 1}\`);
                    return this.getEntityCollectionForLevel(this.currentLevel - 1);
                }
                return [
${entities}
                ];`;
    }
    
    /**
     * Validate level configuration
     */
    static validateLevelConfig(config) {
        const errors = [];
        
        if (!config.levelNumber || config.levelNumber < 8) {
            errors.push('levelNumber must be 8 or higher');
        }
        
        if (!config.entityNames || config.entityNames.length !== 5) {
            errors.push('entityNames must be an array of exactly 5 entity class names');
        }
        
        if (!config.entityTypes || config.entityTypes.length !== 5) {
            errors.push('entityTypes must be an array of exactly 5 entity type strings');
        }
        
        if (!config.pointValues || config.pointValues.length !== 5) {
            errors.push('pointValues must be an array of exactly 5 point values');
        }
        
        if (!config.pointThreshold || config.pointThreshold < 70000) {
            errors.push('pointThreshold must be 70000 or higher for new levels');
        }
        
        return errors;
    }
    
    /**
     * Generate complete level integration guide
     */
    static generateLevelGuide(config) {
        const errors = this.validateLevelConfig(config);
        if (errors.length > 0) {
            console.error('🎮 Level configuration errors:', errors);
            return { success: false, errors };
        }
        
        const code = this.generateLevelIntegrationCode(config);
        
        const guide = `
🎮 LEVEL ${config.levelNumber} INTEGRATION GUIDE
=============================================

1. ADD TO verifyLevelEntities() method around line 434:
${code.verifyLevelEntitiesCode}

2. ADD TO loadEntityCollectionForLevel() method around line 400:
${code.loadEntityCollectionCode}

3. ADD TO spawnLevelEntity() method around line 1550:
${code.spawnLevelEntityCode}

4. ADD TO getEntityCollectionForLevel() method around line 470:
${code.entityCollectionCode}

5. ADD TO levelThresholds around line 95:
${code.levelThresholdCode}

6. UPDATE premiumLevelsState in constructor around line 110:
            level${config.levelNumber}: false,

7. UPDATE isPremiumLevelUnlocked() method around line 178:
        if (level === ${config.levelNumber}) return this.premiumLevelsState.level${config.levelNumber};

8. CREATE TESTING FUNCTION in SimpleMobileScoreboard:
        window.enableLevel${config.levelNumber}Testing = () => {
            if (window.app && window.app.svgEntityManager) {
                window.app.svgEntityManager.totalPoints = ${config.pointThreshold + 5000};
                window.app.svgEntityManager.premiumLevelsState.level${config.levelNumber} = true;
                window.app.svgEntityManager.refreshLevelProgression();
                console.log('👑 Level ${config.levelNumber} testing enabled');
            }
        };
`;
        
        return { success: true, guide, code };
    }
    
    /**
     * Quick setup for common level configurations
     */
    static getQuickConfig(levelNumber) {
        const configs = {
            8: {
                levelNumber: 8,
                pointThreshold: 70000,
                entityNames: ['CrystalEntity', 'PrismEntity', 'GeodeEntity', 'DiamondEntity', 'RubyEntity'],
                entityTypes: ['crystal', 'prism', 'geode', 'diamond', 'ruby'],
                pointValues: [800, 900, 1000, 1100, 1200]
            },
            9: {
                levelNumber: 9,
                pointThreshold: 80000,
                entityNames: ['StormEntity', 'LightningEntity', 'TornadoEntity', 'HurricaneEntity', 'BlizzardEntity'],
                entityTypes: ['storm', 'lightning', 'tornado', 'hurricane', 'blizzard'],
                pointValues: [900, 1000, 1100, 1200, 1300]
            }
        };
        
        return configs[levelNumber] || null;
    }
}

// Export for global use
window.LevelRegistrationHelper = LevelRegistrationHelper;

// Usage example:
console.log(`
🎮 LEVEL REGISTRATION HELPER LOADED

Usage Examples:
===============

// Quick setup for Level 8:
const config = LevelRegistrationHelper.getQuickConfig(8);
const guide = LevelRegistrationHelper.generateLevelGuide(config);
console.log(guide.guide);

// Custom level setup:
const customConfig = {
    levelNumber: 10,
    pointThreshold: 90000,
    entityNames: ['MyEntity1', 'MyEntity2', 'MyEntity3', 'MyEntity4', 'MyEntity5'],
    entityTypes: ['my_entity_1', 'my_entity_2', 'my_entity_3', 'my_entity_4', 'my_entity_5'],
    pointValues: [1000, 1100, 1200, 1300, 1400]
};
const customGuide = LevelRegistrationHelper.generateLevelGuide(customConfig);
console.log(customGuide.guide);
`);

console.log('🎮 LevelRegistrationHelper loaded');