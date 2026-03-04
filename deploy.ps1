# Deploy FirstTaps MV3D Browser App to GitHub Pages
# Usage: .\deploy.ps1

Write-Host "🚀 Starting deployment..." -ForegroundColor Cyan

# Build Flutter web app
Write-Host "📦 Building Flutter web app..." -ForegroundColor Yellow
flutter build web --release

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Create temp directory for deployment
$tempDir = "../temp-gh-pages-deploy"
if (Test-Path $tempDir) { 
    Write-Host "🧹 Cleaning up old deployment folder..." -ForegroundColor Yellow
    Remove-Item $tempDir -Recurse -Force 
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy only web build files
Write-Host "📋 Copying web build files..." -ForegroundColor Yellow
Copy-Item -Path "build/web/*" -Destination $tempDir -Recurse

# Add required files
Set-Location $tempDir
Write-Host "📝 Adding CNAME and .nojekyll..." -ForegroundColor Yellow
"mv3d.firsttaps.com" | Out-File -FilePath "CNAME" -Encoding ascii
New-Item -ItemType File -Name ".nojekyll" | Out-Null

# Deploy to gh-pages
Write-Host "🔧 Initializing git repository..." -ForegroundColor Yellow
git init
git add .
git config user.email "tomdiamond111@gmail.com"
git config user.name "Tom Diamond"
git commit -m "Deploy update - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

Write-Host "⬆️ Pushing to GitHub Pages..." -ForegroundColor Yellow
git remote add origin https://github.com/tomdiamond111/firsttaps-mv3d-browser.git 2>$null
git branch -M gh-pages
git push -u origin gh-pages --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed!" -ForegroundColor Red
    Set-Location ../firsttaps_mv3d_browser
    exit 1
}

# Cleanup
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Set-Location ../firsttaps_mv3d_browser
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "✅ Deployed successfully to https://mv3d.firsttaps.com!" -ForegroundColor Green
Write-Host "⏳ Wait 1-2 minutes for GitHub Pages to update." -ForegroundColor Cyan
Write-Host ""
