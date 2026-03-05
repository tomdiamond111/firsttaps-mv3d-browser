# Build FirstTaps MV3D Browser App
# This script:
# 1. Builds the JavaScript bundles (bundle_core_production.js, bundle_premium_production.js)
# 2. Builds the Flutter web app with environment variables from .env.local
#
# Usage: .\build.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FirstTaps MV3D Browser - BUILD SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$originalDir = Get-Location

# ============================================================================
# STEP 1: Load environment variables from .env.local
# ============================================================================
Write-Host "[1/3] Loading API keys from .env.local..." -ForegroundColor Yellow

$envFile = Join-Path $originalDir ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.local file not found!" -ForegroundColor Red
    Write-Host "Please create .env.local with your API keys" -ForegroundColor Yellow
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            $envVars[$key] = $value
        }
    }
}

Write-Host "Loaded $($envVars.Count) environment variables" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Build JavaScript bundles
# ============================================================================
Write-Host "[2/3] Building JavaScript bundles..." -ForegroundColor Yellow

$jsBuildScript = Join-Path $originalDir "assets\web\js\build_modular_fixed.ps1"
if (Test-Path $jsBuildScript) {
    Push-Location (Join-Path $originalDir "assets\web\js")
    & .\build_modular_fixed.ps1 -Production
    Pop-Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: JavaScript bundle build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "JavaScript bundles built successfully!" -ForegroundColor Green
} else {
    Write-Host "WARNING: JavaScript build script not found at: $jsBuildScript" -ForegroundColor Yellow
    Write-Host "Skipping JavaScript bundle build..." -ForegroundColor Yellow
}
Write-Host ""

# ============================================================================
# STEP 3: Build Flutter web app
# ============================================================================
Write-Host "[3/3] Building Flutter web app..." -ForegroundColor Yellow

# Prepare dart-defines for environment variables
$dartDefines = @()
foreach ($key in $envVars.Keys) {
    if ($envVars[$key]) {
        $dartDefines += "--dart-define=$key=$($envVars[$key])"
    }
}

# Build Flutter web
Write-Host "Running: flutter build web --release" -ForegroundColor Gray
if ($dartDefines.Count -gt 0) {
    flutter build web --release $dartDefines
} else {
    flutter build web --release
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Flutter build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Flutter web app built successfully!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# BUILD COMPLETE
# ============================================================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "BUILD COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Build output is in: build\web\" -ForegroundColor Cyan
Write-Host "To deploy to GitHub Pages, run: .\deploy.ps1" -ForegroundColor Cyan
Write-Host ""
