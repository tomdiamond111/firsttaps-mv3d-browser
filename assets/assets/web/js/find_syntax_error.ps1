# Script to find which module causes syntax error
$rootDir = "c:\Users\tomdi\FirstTapsMV3D_v15\assets\web\js"
$testFile = "$rootDir\test_bundle.js"

# Read the core module list from build script
$coreModules = @(
    'modules\config\appConfig.js',
    'modules\core\sharedState.js',
    'modules\core\globalPositionManager.js',
    'modules\core\initialWorldPreference.js',
    'modules\environments\islandGenerator.js',
   'modules\environments\palmTreeGenerator.js',
    'modules\environments\oceanCloudGenerator.js',
    'modules\environments\oceanEnvironmentCoordinator.js',
    'modules\worlds\sharedEnvironmentSystem.js',
    'modules\worlds\worldTemplates.js',
    'modules\premium\worldTemplateRegistryHelper.js',
    'modules\worlds\recordStoreWorld.js',
    'modules\worlds\musicFestivalWorld.js',
    'modules\worlds\modernGalleryWorlds.js',
    'modules\worlds\futureCarGalleryWorld.js',
    'modules\worlds\newWorldsRegistry.js',
    'modules\worlds\forestTreeTrunkSupport.js',
    'modules\worlds\forestTreeLeavesSystem.js',
    'modules\worlds\forestWorldGravity.js',
    'modules\worlds\forestWorldIntegration.js',
    'modules\objects\objectCreators.js',
    'modules\objects\objectPositioning.js',
    'modules\audio\audioMetadataParser.js',
    'modules\audio\audioFaceTextureManager.js',
    'modules\visuals\documentFaceTextureManager.js',
    'modules\branding\brandDatabase.js',
    'modules\branding\brandManager.js',
    'modules\branding\brandingService.js',
    'modules\objects\virtualObjectCreators.js',
    'modules\objects\virtualObjectManager.js',
    'modules\visuals\billboardManager.js',
    'modules\visuals\visualStackIndicators.js',
    'modules\visuals\linkVisualManager.js',
    'modules\linkTitleLabels.js',
    'modules\services\faviconService.js',
    'modules\interaction\focusZoneManager.js',
    'modules\interaction\inputManager.js',
    'modules\interaction\interactionManager.js',
    'modules\interaction\moveManager.js',
    'modules\interaction\elevatedMarkerHelper.js',
    'modules\interaction\linkInteractionManager.js',
    'objectInteraction.js',
    'modules\app\mainApplication.js',
    'modules\core\initialization.js'
)

$bundleContent = ""
$moduleNumber = 0

foreach ($module in $coreModules) {
    $modulePath = Join-Path $rootDir $module
    $moduleNumber++
    
    if (Test-Path $modulePath) {
        Write-Host "Testing module $moduleNumber : $module" -ForegroundColor Cyan
        
        # Add module content
        $moduleContent = Get-Content $modulePath -Raw -Encoding UTF8
        $bundleContent += "`n// MODULE $moduleNumber : $module`n"
        $bundleContent += $moduleContent
        $bundleContent += "`n"
        
        # Write to test file
        $bundleContent | Out-File -FilePath $testFile -Encoding UTF8
        
        # Test syntax
        $result = & node -c $testFile 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Syntax error after adding module: $module" -ForegroundColor Red
            Write-Host "Error output: $result" -ForegroundColor Yellow
            break
        } else {
            Write-Host "  ✓ OK" -ForegroundColor Green
        }
    } else {
        Write-Host "Module not found: $module" -ForegroundColor Red
    }
}

# Clean up
if (Test-Path $testFile) {
    Remove-Item $testFile
}

Write-Host "COMPLETE: Syntax error detection complete" -ForegroundColor Green
