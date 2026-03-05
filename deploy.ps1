# Deploy FirstTaps MV3D Browser App to GitHub Pages
# This script deploys the built web app from build/web/ to the gh-pages branch
# Run .\build.ps1 first to build the app
# Usage: .\deploy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FirstTaps MV3D Browser - DEPLOY SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$originalDir = Get-Location

# ============================================================================
# STEP 1: Verify build output exists
# ============================================================================
Write-Host "[1/4] Verifying build output..." -ForegroundColor Yellow

$buildWebPath = Join-Path $originalDir "build\web"
if (-not (Test-Path $buildWebPath)) {
    Write-Host "ERROR: Build output not found at: $buildWebPath" -ForegroundColor Red
    Write-Host "Please run .\build.ps1 first to build the app" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path (Join-Path $buildWebPath "index.html"))) {
    Write-Host "ERROR: index.html not found in build output" -ForegroundColor Red
    Write-Host "Please run .\build.ps1 first to build the app" -ForegroundColor Yellow
    exit 1
}

Write-Host "Build output verified!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Create temporary deployment directory
# ============================================================================
Write-Host "[2/4] Preparing deployment directory..." -ForegroundColor Yellow

$parentDir = Split-Path -Parent $originalDir
$tempDir = Join-Path $parentDir "temp-gh-pages-deploy"

# Clean up old temp directory if it exists
if (Test-Path $tempDir) {
    Write-Host "Cleaning up old deployment directory..." -ForegroundColor Gray
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# Create fresh temp directory
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Host "Created temporary deployment directory" -ForegroundColor Green

# Copy build output to temp directory
Write-Host "Copying build files..." -ForegroundColor Gray
Copy-Item -Path "$buildWebPath\*" -Destination $tempDir -Recurse -Force

# Add required GitHub Pages files
Set-Location $tempDir
Write-Host "Adding CNAME..." -ForegroundColor Gray
"mv3d.firsttaps.com" | Out-File -FilePath "CNAME" -Encoding ascii

Write-Host "Adding .nojekyll..." -ForegroundColor Gray
New-Item -ItemType File -Name ".nojekyll" -Force | Out-Null

Write-Host "Deployment directory ready!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 3: Initialize git and commit
# ============================================================================
Write-Host "[3/4] Creating git commit..." -ForegroundColor Yellow

git init
git add .
git config user.email "tomdiamond111@gmail.com"
git config user.name "Tom Diamond"
git commit -m "Deploy to GitHub Pages - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git commit failed!" -ForegroundColor Red
    Set-Location $originalDir
    exit 1
}

Write-Host "Git commit created!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 4: Push to GitHub Pages
# ============================================================================
Write-Host "[4/4] Pushing to GitHub Pages (gh-pages branch)..." -ForegroundColor Yellow

git remote add origin https://github.com/tomdiamond111/firsttaps-mv3d-browser.git 2>$null
git branch -M gh-pages
git push -u origin gh-pages --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Push to GitHub failed!" -ForegroundColor Red
    Write-Host "Please check your GitHub credentials and network connection" -ForegroundColor Yellow
    Set-Location $originalDir
    exit 1
}

# ============================================================================
# CLEANUP AND SUCCESS
# ============================================================================
Set-Location $originalDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app has been deployed to:" -ForegroundColor Cyan
Write-Host "  https://mv3d.firsttaps.com" -ForegroundColor White
Write-Host "  https://tomdiamond111.github.io/firsttaps-mv3d-browser/" -ForegroundColor White
Write-Host ""
Write-Host "Note: It may take a few minutes for GitHub Pages to update" -ForegroundColor Yellow
Write-Host ""

# Optional cleanup of temp directory
Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "Done!" -ForegroundColor Green
