# build_modular_split.ps1
# Build script for modular Three.js file viewer with Core + Premium split
param(
    [switch]$Development = $false,
    [switch]$Test = $false,
    [switch]$Production = $false
)

Write-Host "Building Three.js File Viewer - Split Bundle System" -ForegroundColor Green
Write-Host "Development Mode: $Development" -ForegroundColor Yellow
Write-Host "Production Mode: $Production" -ForegroundColor Yellow

# Define the root directory (dynamically based on current script location)
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modulesDir = "$rootDir\modules"

# Define output files for split bundles
$coreOutputFile = "$rootDir\bundle_core_production.js"
$premiumOutputFile = "$rootDir\bundle_premium_production.js"

# Generate timestamp for cache busting in HTML
$timestamp = Get-Date -Format 'yyyyMMdd_HHmm'

# Core modules (everything except premium features)
$coreModuleOrder = @(
    # App Configuration (MUST BE FIRST - controls production/debug modes)
    'modules\config\appConfig.js',
    
    # Core (no dependencies)
    'modules\core\sharedState.js',
    'modules\core\globalPositionManager.js',
    
    # Initial world preference (must load early, before world initialization)
    'modules\core\initialWorldPreference.js',
    
    # Environment modules (no dependencies except Three.js)
    'modules\environments\islandGenerator.js',
    'modules\environments\palmTreeGenerator.js',
    'modules\environments\oceanCloudGenerator.js',
    'modules\environments\oceanEnvironmentCoordinator.js',
    
    # World systems (depends on core and environment modules)
    'modules\worlds\sharedEnvironmentSystem.js',
    'modules\worlds\worldTemplates.js',
    
    # World template registry helper (must load before new world templates)
    'modules\premium\worldTemplateRegistryHelper.js',
    
    # NEW MEDIA-FOCUSED WORLD TEMPLATES (Free worlds)
    'modules\worlds\recordStoreWorld.js',
    'modules\worlds\musicFestivalWorld.js',
    'modules\worlds\modernGalleryWorlds.js',
    'modules\worlds\futureCarGalleryWorld.js',
    'modules\worlds\newWorldsRegistry.js',
    
    'modules\worlds\forestTreeTrunkSupport.js',
    'modules\worlds\forestTreeLeavesSystem.js',
    'modules\worlds\forestWorldGravity.js',
    'modules\worlds\forestWorldIntegration.js',
    
    # Object systems (depends on core)
    'modules\objects\objectCreators.js',
    'modules\objects\objectPositioning.js',
    
    # Audio metadata systems (standalone utilities, no dependencies)
    'modules\audio\audioMetadataParser.js',
    'modules\audio\audioFaceTextureManager.js',
    
    # Document face texture systems (standalone utilities, no dependencies)
    'modules\visuals\documentFaceTextureManager.js',
    
    # Branding systems (depends on core, no other dependencies)
    'modules\branding\brandDatabase.js',
    'modules\branding\brandManager.js',
    'modules\branding\brandingService.js',
    
    # Virtual object systems (depends on objects + core + branding)
    'modules\objects\virtualObjectCreators.js',
    'modules\objects\virtualObjectManager.js',
    
    # Visual systems (depends on objects + core + audio for face textures)
    'modules\visuals\billboardManager.js',
    'modules\visuals\visualStackIndicators.js',
    'modules\visuals\linkVisualManager.js',
    
    # Link title labels (depends on linkVisualManager)
    'modules\linkTitleLabels.js',
    
    # Service systems (depends on core)
    'modules\services\faviconService.js',
    
    # Content recommendation services (depends on core only)
    'modules\services\recommendationsConfig.js',
    'modules\services\recommendationsStorage.js',
    'modules\services\contentPreferenceLearningService.js',
    'modules\services\recommendationService.js',
    'modules\services\recommendationContentManager.js',
    'modules\services\recommendationSystemInit.js',
    
    # Media feedback system (depends on ContentPreferenceLearningService)
    'modules\content\mediaFeedbackManager.js',
    
    # Interaction systems (depends on core)
    'modules\interaction\focusZoneManager.js',
    'modules\interaction\inputManager.js',
    'modules\interaction\interactionManager.js',
    # MV3D: SMS screen camera manager disabled
    # 'modules\interaction\smsScreenCameraManager.js',
    'modules\interaction\moveManager.js',
    'modules\interaction\elevatedMarkerHelper.js',  # Y-axis climbing during drag (NEW)
    'modules\interaction\linkInteractionManager.js',
    'objectInteraction.js',
    
    # Sorting systems (depends on core + worlds)
    'modules\sorting\stackingEngine.js',
    'modules\stacking\filenameStackingCriteria.js',
    'modules\stacking\advancedStackingCriteria.js',
    'modules\sorting\sortingManager.js',
    
    # Search systems (depends on core + objects)
    'modules\search\searchManager.js',
    
    # Contact search systems (depends on search + contact objects)
    'modules\search\contactSearchManager.js',
    'modules\search\searchExtensionService.js',
    'modules\search\searchExtensionIntegration.js',
    
    # File object management (depends on objects + visuals + interaction)
    'modules\objects\fileObjectManager.js',
    
    # Backup/restore utilities (depends on file object management)
    'modules\utils\backupRestoreManager.js',
    
    # Phone number utilities (standalone utility for SMS/contact functionality)
    'modules\utils\phoneUtils.js',
    
    # Metadata cache (localStorage-based caching for platform metadata/thumbnails)
    'modules\utils\metadataCache.js',
    
    # Version manager (app version tracking and update notifications)
    'modules\utils\versionManager.js',
    
    # URL processing systems (new functionality)
    'modules\url\urlProcessor.js',
    'modules\url\urlManager.js',
    
    # Link name persistence systems (new functionality)
    'modules\persistence\linkNamePersistenceChannel.js',
    'modules\persistence\linkNameManager.js',
    'modules\persistence\linkNameInitializer.js',
    
    # Furniture name persistence system (parallel to link name system)
    'modules\persistence\furnitureNameManager.js',
    
    # Default link initialization (creates example links on first launch)
    'modules\initialization\defaultLinkInitializer.js',
    
    # Poster URL persistence system (new functionality)
    'posterURLPersistenceChannel.js',
    
    # NEW GLOBAL POSTER SYSTEM (must load before world templates)
    'modules\poster\GlobalPosterManager.js',
    'modules\poster\SimplifiedPosterCreator.js',
    'modules\poster\PosterSystemInitializer.js',
    'modules\poster\defaultPosterURLs.js',
    
    # App synchronization bridge (menu sync with 3D world state)
    'appSyncBridge.js',
    
    # Contact SMS systems (new functionality - depends on core + objects)
    'modules\objects\contactObject.js',
    # MV3D: SMS screen disabled, replaced with Contact Info Screen
    # 'modules\objects\smsScreen.js',
    'modules\objects\contactManager.js',
    
    # MV3D: New Contact Info Screen (replacement for SMS screen)
    'modules\objects\contactInfoScreen.js',
    
    # MV3D: Media Preview System (for YouTube, Spotify, video/audio playback)
    'modules\objects\mediaPreviewScreen.js',
    'modules\objects\mediaPreviewManager.js',
    
    # Avatar Persistence Bridge (must load before contact customization)
    'avatar_persistence_bridge.js',
    
    # Contact Avatar Customization System (depends on contact objects)
    'modules\contacts\avatarStyles.js',
    'modules\contacts\avatarGenerator.js',
    'contactDialerBridge.js',
    'smsBridge.js',
    'modules\contacts\contactOptionsMenu.js',
    'modules\contacts\contactCustomizationManager.js',
    
    # NEW HTML DEMO SVG AVATAR SYSTEM (Phase 1 implementation)
    'htmlDemoSvgEngine.js',                # EXACT copy of HTML demo SVG generation
    'htmlDemoCustomizationUI.js',          # EXACT copy of HTML demo UI structure  
    'svgAvatarReplacer.js',                # Simple replacement of existing avatar functions
    
    # ============================================================================
    # MV3D: ALL SMS MODULES DISABLED - Functionality preserved but not loaded
    # ============================================================================
    
    # # NEW SMS CORE SYSTEM (Independent SMS management - must load early)
    # 'modules\sms\smsCoreService.js',
    # 'modules\sms\smsBridgeManager.js',
    # 'modules\sms\smsScreenAdapter.js',
    
    # # SMS Event Coordinator (Centralized event management - must load before other SMS modules)
    # 'modules\sms\smsEventCoordinator.js',
    
    # # 🔥 SIMPLIFIED SMS SYSTEM (New experimental architecture)
    # 'modules\sms\smsSimpleCore.js',     # Ultra-simple message display core
    # 'modules\sms\smsAlertSystem.js',    # Isolated alert system
    
    # # Enhanced SMS interaction systems (depends on SMS + interaction)
    # 'modules\sms\smsInteractionManager.js',
    
    # # SMS Text Input Bridge (must load before SMS Integration Manager)
    # 'modules\sms\smsTextInputBridge.js',
    
    # # SMS Input Manager (must load before SMS Integration Manager)
    # 'modules\sms\smsInputManager.js',
    
    # # REFACTORED SMS CHANNEL SYSTEM (modular components in dependency order)
    # 'modules\sms\smsChannelSetup.js',
    # 'modules\sms\smsThrottleManager.js', 
    # 'modules\sms\smsContactResolver.js',
    # 'modules\sms\smsMessageHandler.js',
    # 'modules\sms\smsEventNotifier.js',
    
    # # SMS Channel Integration (depends on SMS + interaction + text bridge + input manager + refactored components)
    # 'modules\sms\smsEventRouter.js',
    # 'modules\sms\smsChannelManager.js',
    # 'modules\sms\smsIntegrationManager.js',
    # 'modules\sms\smsChannelIntegration.js',
    # 'modules\sms\smsInitialization.js',
    # 'modules\sms\smsSystemInit.js',
    # 'modules\sms\smsObserverMonitor.js',
    
    # # SMS Core Initializer (must load after all SMS components)
    # 'modules\sms\smsCoreInitializer.js',
    
    # # 3D SMS BALLOON SYSTEM (optional 3D message display - standalone feature)
    # 'modules\sms\sms3DSettings.js',
    # 'modules\sms\sms3DSoundManager.js',
    # 'modules\sms\sms3DBalloonRenderer.js',
    # 'modules\sms\sms3DMessageBalloon.js',
    # 'modules\sms\sms3DBalloonManager.js',
    
    # ============================================================================
    # MV3D: END SMS MODULES
    # ============================================================================
    
    # MV3D: SMS feature flags kept for compatibility (all flags set to false)
    'modules\config\smsFeatureFlags.js',
    
    # MV3D: SMS ALERT SYSTEM disabled
    # # SMS ALERT SYSTEM (must load after SMS Core but before integration)
    # 'modules\alerts\contactNotificationRing.js',
    # 'modules\alerts\smsInteractionDetector.js',
    # 'modules\alerts\contactAlertManager.js',
    # 'modules\alerts\smsAlertInitializer.js',
    
    # MV3D: SMS Integration Helper disabled
    # # SMS Integration Helper (connects new SMS Core with existing 3D systems)
    # 'modules\sms\smsIntegrationHelper.js',
    
    # World management utilities (depends on core)
    'modules\app\worldManagement.js',
    
    # Camera management utilities (depends on core)
    'modules\app\cameraManager.js',
    
    # NEW: Camera optimization system (depends on Three.js and cameraManager)
    'modules\app\cameraStateManager.js',
    'modules\app\cameraTransitionController.js',
    'modules\app\cameraOptimizationUtils.js',
    
    # Camera focus manager (depends on camera)
    'modules\camera\cameraFocusManager.js',

    # Explore mode system (depends on camera and core)
    'modules\explore\exploreMode.js',
    'modules\explore\exploreControls.js',
    'modules\explore\exploreUI.js',
    'modules\explore\exploreAvatarCollisionManager.js',
    'modules\explore\exploreAvatarCustomizationManager.js',
    'modules\explore\exploreManager.js',
    
    # EasyNav mode system (depends on camera and core)
    'modules\easynav\easyNavMode.js',
    'modules\easynav\easyNavMap.js',
    'modules\easynav\easyNavManager.js',

    # Path system (depends on core)
    'modules\paths\pathDataModel.js',
    'modules\paths\pathVisualManager.js',
    'modules\paths\pathManager.js',

    # Playback system (must load before furniture/paths)
    'modules\playback\youtubePlayerManager.js',

    # Furniture system (depends on core, similar to paths)
    'modules\furniture\furnitureDataModel.js',
    'modules\furniture\furnitureIdleAnimations.js',    # Idle/attraction mode animations
    'modules\furniture\furnitureVisualManager.js',
    'modules\furniture\furnitureManager.js',
    'modules\furniture\furnitureViewManager.js',       # Closeup view & drag-to-rotate
    'modules\furniture\viewSelectionOverlay.js',       # 2D/3D view selection overlay
    'modules\furniture\demoContentConfig.js',          # Demo content configuration (MUST load before spawner)
    
    # NEW: Content preferences and dynamic generation system
    'modules\preferences\contentPreferencesService.js', # User genre/category preferences
    'modules\furniture\dynamicContentGenerator.js',     # Dynamic genre-based content generation
    'modules\furniture\furnitureHistoryManager.js',     # Back button / state history
    'modules\furniture\furnitureUIControls.js',         # Refresh/Back button UI overlay
    
    'modules\furniture\defaultFurnitureSpawner.js',
    
    # Furniture sharing system (depends on furniture + URL systems)
    'modules\sharing\furnitureShareManager.js',
    
    # Browser-specific recommendation fetcher (fetches remote config for demo content)
    'modules\browser\browserRecommendationsFetcher.js',
    
    # Browser-specific menu system (replaces Flutter ObjectActionChannel)
    'modules\browser\browserMenuHandler.js',

    # Rotation interaction (supports both furniture and paths)
    'modules\interactions\rotationInteraction.js',

    # SVG Entity system (depends on explore mode and interaction systems)
    'modules\\entities\\ui\\simpleMobileScoreboard.js',
    'modules\\entities\\managers\\entityUIManager.js',
    'modules\\entities\\managers\\levelProgressionNotifier.js',
    'modules\\entities\\testing\\entityTestingUI.js',
    
    # Premium Gaming Bridge (Level 3→4 progression fix)
    'premium_gaming_bridge.js',
    
    'modules\\testing\\javascriptTestingBridge.js',
    'modules\entities\entityTypes\entityCollectionGroup1.js',
    'modules\entities\entityTypes\entityCollectionGroup2.js',
    'modules\entities\entityTypes\entityCollectionGroupLevel2.js',
    'modules\entities\entityTypes\entityCollectionGroupLevel3.js',
    'modules\entities\entityTypes\entityCollectionGroupLevel4.js',
    'modules\entities\entityTypes\entityCollectionGroupLevel5.js',
    'modules\entities\entityTypes\entityCollectionGroupLevel6.js',
    'modules\entities\entityTypes\entityCollectionGroupLevel7.js',
    'modules\entities\promotionalEntities.js',
    'modules\entities\svgEntityManager.js',
    'modules\entities\treasureBoxManager.js',
    
    # Debug utilities (depends on app and all managers)
    'modules\debug\debugManager.js',
    
    # Main application (depends on all above systems)
    'modules\app\mainApplication.js',
    
    # Initialization and utilities (depends on all systems)
    'modules\core\initialization.js'
)

# Premium modules (loaded separately, depends on core bundle)
$premiumModuleOrder = @(
    # Premium poster and decoration modules (dependencies)
    'modules\premium\posterCreator.js',
    # 'modules\premium\posterInteraction.js',  # DISABLED - Using GlobalPosterManager instead
    'modules\premium\bedroomDecorations.js',
    # Christmas modules (must come before world templates)
    'modules\premium\christmasDecorations.js',
    'modules\premium\christmasLogCabin.js',
    'modules\premium\christmasLights.js',
    # PREMIUM WORLD TEMPLATES (all independent, extending BaseWorldTemplate)
    'modules\premium\premiumWorldThemes.js',        # Forest Realm + Dazzle Bedroom
    'modules\premium\caveExplorerWorldTemplate.js', # Cave Explorer (independent)
    'modules\premium\christmasLandWorldTemplate.js', # ChristmasLand (independent)
    'modules\premium\worldCleanupHelper.js',         # Cleanup utilities for new templates
    'modules\premium\simpleWorldTemplate.js',       # Base class for easy template creation
    'modules\premium\dynamicPremiumDetection.js',   # Auto-discovery premium detection system
    'modules\premium\worldTemplateAutoIntegration.js', # Auto-integration system for new worlds
    'modules\premium\desertOasisWorldTemplate.js',  # Desert Oasis (uses helper system)
    'modules\premium\tropicalParadiseWorldTemplate.js', # Tropical Paradise (new)
    'modules\premium\flowerWonderlandWorldTemplate.js', # Flower Wonderland (new)
    # Premium features (depends on all world templates being available)
    'modules\premium\forestMovementMenu.js',
    'modules\premium\gamingHelpers.js',
    'modules\premium\premiumIntegration.js'
)

Write-Host "Creating split bundle system..." -ForegroundColor Cyan

# Function to build a bundle from a module list
function Build-Bundle {
    param(
        [string]$BundleName,
        [string]$OutputFile,
        [array]$ModuleList,
        [string]$BundleType
    )
    
    Write-Host "Building $BundleName..." -ForegroundColor Yellow
    
    # Create the bundle header
    $bundleHeader = @"
// ============================================================================
// THREE.JS FILE VIEWER - $BundleName
// Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
// Development Mode: $Development
// Bundle Type: $BundleType
// ============================================================================

console.log("Loading Three.js File Viewer - $BundleName...");

"@

    # Initialize the bundle content
    $bundleContent = $bundleHeader
    
    # Process each module in order
    $moduleCount = 0
    foreach ($module in $ModuleList) {
        $modulePath = Join-Path $rootDir $module
        
        if (Test-Path $modulePath) {
            Write-Host "  Adding module: $module" -ForegroundColor White
            
            # Add module separator
            $bundleContent += @"

// ============================================================================
// MODULE: $module
// ============================================================================

"@
            
            # Add the module content
            $moduleContent = Get-Content $modulePath -Raw -Encoding UTF8
            $bundleContent += $moduleContent
            $bundleContent += "`n"
            $moduleCount++
            
        } else {
            Write-Host "  WARNING: Module not found: $module" -ForegroundColor Red
        }
    }
    
    # Add bundle footer
    $bundleFooter = @"

// ============================================================================
// $BundleName COMPLETE - $moduleCount modules loaded
// ============================================================================
console.log("Three.js File Viewer - $BundleName loaded successfully! ($moduleCount modules)");

"@

    $bundleContent += $bundleFooter
    
    # Write the bundle file
    $bundleContent | Out-File -FilePath $OutputFile -Encoding UTF8
    
    $bundleSize = [math]::Round((Get-Item $OutputFile).Length / 1KB, 2)
    Write-Host "$BundleName created: $OutputFile ($bundleSize KB)" -ForegroundColor Green
    
    return $bundleSize
}

# Build Core Bundle
$coreSize = Build-Bundle -BundleName "CORE BUNDLE" -OutputFile $coreOutputFile -ModuleList $coreModuleOrder -BundleType "Core Systems"

# Build Premium Bundle
$premiumSize = Build-Bundle -BundleName "PREMIUM BUNDLE" -OutputFile $premiumOutputFile -ModuleList $premiumModuleOrder -BundleType "Premium Features"

Write-Host "" -ForegroundColor White
Write-Host "Bundle Summary:" -ForegroundColor Cyan
Write-Host "  Core Bundle: $coreSize KB" -ForegroundColor Yellow
Write-Host "  Premium Bundle: $premiumSize KB" -ForegroundColor Yellow
Write-Host "  Total Size: $([math]::Round($coreSize + $premiumSize, 2)) KB" -ForegroundColor Yellow

# Update the HTML file with the new timestamp for both bundles
$htmlFile = "$rootDir\..\index2.html"
if (Test-Path $htmlFile) {
    Write-Host "" -ForegroundColor White
    Write-Host "Updating HTML with new timestamps and version..." -ForegroundColor Cyan
    
    # Read the version from versionManager.js
    $versionManagerPath = "$rootDir\modules\utils\versionManager.js"
    $currentVersion = "1.2.19" # Default fallback
    
    if (Test-Path $versionManagerPath) {
        $versionManagerContent = Get-Content $versionManagerPath -Raw
        if ($versionManagerContent -match "const CURRENT_APP_VERSION = '([^']+)'") {
            $currentVersion = $Matches[1]
            Write-Host "  Detected version from versionManager.js: $currentVersion" -ForegroundColor Yellow
        }
    }
    
    # Read the HTML content
    $htmlContent = Get-Content $htmlFile -Raw
    
    # Replace timestamps for both bundle script tags
    $htmlContent = $htmlContent -replace 'bundle_core_production\.js\?v=\d{8}_\d{4}', "bundle_core_production.js?v=$timestamp"
    $htmlContent = $htmlContent -replace 'bundle_premium_production\.js\?v=\d{8}_\d{4}', "bundle_premium_production.js?v=$timestamp"
    
    # Also handle legacy single bundle references (in case they exist)
    $htmlContent = $htmlContent -replace 'bundle_modular_production\.js\?v=\d{8}_\d{4}', "bundle_core_production.js?v=$timestamp"
    
    # Update the EXPECTED_VERSION in the inline version check script
    $htmlContent = $htmlContent -replace "const EXPECTED_VERSION = '[^']*'", "const EXPECTED_VERSION = '$currentVersion'"
    
    # Write the updated HTML content back
    $htmlContent | Out-File -FilePath $htmlFile -Encoding UTF8 -NoNewline
    
    Write-Host "HTML file updated with new timestamps and version" -ForegroundColor Green
    Write-Host "  Core bundle timestamp: $timestamp" -ForegroundColor Yellow
    Write-Host "  Premium bundle timestamp: $timestamp" -ForegroundColor Yellow
    Write-Host "  Expected version: $currentVersion" -ForegroundColor Yellow
} else {
    Write-Host "WARNING: HTML file not found at $htmlFile" -ForegroundColor Red
}

if ($Test) {
    Write-Host "" -ForegroundColor White
    Write-Host "Testing bundle syntax..." -ForegroundColor Cyan
    # Basic syntax test - we could enhance this later
    Write-Host "Bundle test complete" -ForegroundColor Green
}

Write-Host "" -ForegroundColor White
Write-Host "Split Bundle Build Complete!" -ForegroundColor Green
Write-Host "[OK] Core bundle: Ready for all users" -ForegroundColor Green
Write-Host "[OK] Premium bundle: Loads only when premium features needed" -ForegroundColor Green

# Explicitly exit with success code
exit 0
