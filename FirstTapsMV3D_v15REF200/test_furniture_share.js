/**
 * FURNITURE SHARE TESTING SCRIPT
 * Copy and paste this into the browser console to test share functionality
 */

console.log('🧪 FURNITURE SHARE TEST SCRIPT');
console.log('================================\n');

async function testFurnitureShare() {
    // Step 1: Check if share manager is available
    console.log('1️⃣ Checking for FurnitureShareManager...');
    if (!window.app) {
        console.error('❌ window.app not found. App not initialized?');
        return;
    }
    
    if (!window.app.shareManager) {
        console.error('❌ shareManager not found. Build may not include sharing module.');
        return;
    }
    console.log('✅ ShareManager found:', window.app.shareManager);

    // Step 2: List all furniture
    console.log('\n2️⃣ Listing all furniture...');
    const allFurniture = window.app.furnitureManager.getAllFurniture();
    console.log(`Found ${allFurniture.length} furniture pieces:`);
    
    allFurniture.forEach((furniture, index) => {
        const objectCount = furniture.objectIds.filter(id => id).length;
        console.log(`  ${index + 1}. ${furniture.name} (${furniture.type})`);
        console.log(`     ID: ${furniture.id}`);
        console.log(`     Objects: ${objectCount}/${furniture.capacity}`);
        console.log(`     Position: (${furniture.position.x.toFixed(1)}, ${furniture.position.y.toFixed(1)}, ${furniture.position.z.toFixed(1)})`);
    });

    if (allFurniture.length === 0) {
        console.warn('⚠️ No furniture found. Create some furniture first to test sharing.');
        return;
    }

    // Step 3: Test share on first furniture with objects
    console.log('\n3️⃣ Testing share on furniture with objects...');
    const furnitureWithObjects = allFurniture.find(f => 
        f.objectIds.filter(id => id).length > 0
    );

    if (!furnitureWithObjects) {
        console.warn('⚠️ No furniture has objects. Add some YouTube links or files to test.');
        return;
    }

    console.log(`\nSharing: ${furnitureWithObjects.name} (${furnitureWithObjects.id})`);
    const result = await window.app.shareManager.shareFurniture(furnitureWithObjects.id);

    // Step 4: Display results
    console.log('\n4️⃣ Share Results:');
    console.log('================');
    
    if (result.error) {
        console.error('❌ Error:', result.error);
        return;
    }

    console.log('✅ Success!');
    console.log('\n📊 Statistics:');
    console.log(`  Total Objects: ${result.stats.totalObjects}`);
    console.log(`  YouTube Videos: ${result.stats.youtubeObjects}`);
    console.log(`  Vimeo Videos: ${result.stats.vimeoObjects}`);
    console.log(`  Web Links: ${result.stats.webLinkObjects}`);
    console.log(`  Excluded Local Media: ${result.stats.excludedLocalMedia}`);

    if (result.warning) {
        console.warn(`\n⚠️ Warning: ${result.warning}`);
    }

    console.log('\n🔗 Share URL:');
    console.log(result.url);
    console.log('\n📋 URL copied to clipboard!');

    // Step 5: Extract compressed data for testing
    console.log('\n5️⃣ Browser Testing:');
    console.log('========================');
    
    // Extract just the compressed data
    const compressedData = result.url.split('#data=')[1];
    
    console.log('\n📋 OPTION 1 - Use Test Viewer (RECOMMENDED):');
    console.log('   1. Open: file:///C:/Users/tomdi/FirstTapsMV3D_v4b/assets/web/test-share-viewer.html');
    console.log('   2. Paste the compressed data below into the textarea');
    console.log('   3. Click "Open Viewer"');
    console.log('\n📦 Compressed Data (copy this):');
    console.log('─'.repeat(80));
    console.log(compressedData);
    console.log('─'.repeat(80));
    
    console.log('\n📋 OPTION 2 - Direct URL (may fail with file:// protocol):');
    console.log('   Try opening furniture-viewer.html and running this in console:');
    console.log(`   window.location.hash = 'data=${compressedData}';`);
    console.log(`   window.location.reload();`);
    console.log('\n');

    return result;
}

// Auto-run test
console.log('\n🚀 Running test...\n');
testFurnitureShare().then(result => {
    console.log('\n✅ Test complete!');
}).catch(error => {
    console.error('\n❌ Test failed:', error);
});
