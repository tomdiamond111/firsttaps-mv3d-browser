/**
 * WORLD TEMPLATE LOADING TEST
 * Quick test to verify the new factory-based world templates load correctly
 */

console.log('🧪 Testing World Template Loading...');

// Test 1: Check if SimpleWorldTemplate is available
if (typeof window.SimpleWorldTemplate !== 'undefined') {
    console.log('✅ SimpleWorldTemplate is available');
} else {
    console.error('❌ SimpleWorldTemplate is NOT available');
}

// Test 2: Check if factory templates are globally available
const templates = [
    { name: 'FlowerWonderlandWorldTemplate', global: 'FlowerWonderlandWorldTemplate' },
    { name: 'TropicalParadiseWorldTemplate', global: 'TropicalParadiseWorldTemplate' },
    { name: 'DesertOasisWorldTemplate', global: 'DesertOasisWorldTemplate' }
];

templates.forEach(template => {
    if (typeof window[template.global] !== 'undefined') {
        console.log(`✅ ${template.name} is globally available`);
        
        // Test if getConfig method works
        if (typeof window[template.global].getConfig === 'function') {
            const config = window[template.global].getConfig();
            console.log(`✅ ${template.name}.getConfig() works:`, config.displayName);
        } else {
            console.error(`❌ ${template.name}.getConfig() is NOT available`);
        }
    } else {
        console.error(`❌ ${template.name} is NOT globally available`);
    }
});

// Test 3: Check WorldTemplateRegistryHelper integration
if (typeof window.worldTemplateRegistryHelper !== 'undefined') {
    console.log('✅ WorldTemplateRegistryHelper is available');
    
    // Check if templates are registered
    const registeredTemplates = window.worldTemplateRegistryHelper.getNewTemplates();
    console.log(`📋 Registered new templates: ${registeredTemplates.length}`);
    
    registeredTemplates.forEach(template => {
        console.log(`  - ${template.config.id}: ${template.config.displayName}`);
    });
    
    // Test creation of templates
    const testTemplates = ['flower-wonderland', 'tropical-paradise', 'desert-oasis'];
    
    testTemplates.forEach(templateId => {
        if (window.worldTemplateRegistryHelper.isNewTemplate(templateId)) {
            console.log(`✅ ${templateId} is recognized as new template`);
            
            // Test if we can create instance (mock THREE object for testing)
            const mockTHREE = { Scene: function() {}, Mesh: function() {}, PlaneGeometry: function() {}, MeshLambertMaterial: function() {} };
            
            try {
                const instance = window.worldTemplateRegistryHelper.createNewTemplate(templateId, mockTHREE);
                if (instance) {
                    console.log(`✅ ${templateId} instance created successfully`);
                    console.log(`   Type: ${instance.getType ? instance.getType() : 'unknown'}`);
                    console.log(`   Display Name: ${instance.getDisplayName ? instance.getDisplayName() : 'unknown'}`);
                } else {
                    console.error(`❌ ${templateId} instance creation returned null`);
                }
            } catch (error) {
                console.error(`❌ ${templateId} instance creation failed:`, error.message);
            }
        } else {
            console.error(`❌ ${templateId} is NOT recognized as new template`);
        }
    });
} else {
    console.error('❌ WorldTemplateRegistryHelper is NOT available');
}

// Test 4: Check menu configuration
if (typeof window.worldTemplateRegistryHelper !== 'undefined') {
    const menuConfig = window.worldTemplateRegistryHelper.generateFlutterMenuConfig();
    console.log('📱 Flutter menu configuration:');
    menuConfig.forEach(item => {
        console.log(`  - ${item.title} (${item.worldType}) - Premium: ${item.isPremium}`);
    });
}

console.log('🧪 World Template Loading Test Complete!');