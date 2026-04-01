# Inject Environment Variables into Build Output
# This script reads .env.local and replaces placeholders in the built HTML files
# Run after: flutter build web
# Usage: .\inject_env_vars.ps1

param(
    [string]$BuildPath = "build\web"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment Variable Injection" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$originalDir = Get-Location
$buildWebPath = Join-Path $originalDir $BuildPath

# ============================================================================
# STEP 1: Load environment variables from .env.local
# ============================================================================
Write-Host "[1/3] Loading environment variables from .env.local..." -ForegroundColor Yellow

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
# STEP 2: Find HTML files to inject
# ============================================================================
Write-Host "[2/3] Finding HTML files in build output..." -ForegroundColor Yellow

if (-not (Test-Path $buildWebPath)) {
    Write-Host "ERROR: Build path not found: $buildWebPath" -ForegroundColor Red
    Write-Host "Please run .\build.ps1 first to build the app" -ForegroundColor Yellow
    exit 1
}

# Find all HTML files that might contain placeholders
$htmlFiles = @()
$htmlFiles += Get-ChildItem -Path $buildWebPath -Filter "*.html" -Recurse -ErrorAction SilentlyContinue

if ($htmlFiles.Count -eq 0) {
    Write-Host "WARNING: No HTML files found in build output" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($htmlFiles.Count) HTML file(s) to process" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 3: Inject environment variables
# ============================================================================
Write-Host "[3/3] Injecting environment variables..." -ForegroundColor Yellow

$injectedCount = 0
$fileCount = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $replacements = 0
    
    # Replace each environment variable placeholder
    foreach ($key in $envVars.Keys) {
        $placeholder = "%%$key%%"
        if ($content -match [regex]::Escape($placeholder)) {
            $value = $envVars[$key]
            $content = $content -replace [regex]::Escape($placeholder), $value
            $replacements++
            Write-Host "  [OK] Replaced $placeholder in $($file.Name)" -ForegroundColor Gray
        }
    }
    
    # Write back if changes were made
    if ($replacements -gt 0) {
        Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
        $fileCount++
        $injectedCount += $replacements
    }
}

if ($injectedCount -eq 0) {
    Write-Host "No placeholders found to replace" -ForegroundColor Yellow
    Write-Host "This is normal if keys were already injected or no placeholders exist" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "[OK] Injected $injectedCount variable(s) across $fileCount file(s)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Environment Variable Injection Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "All API keys have been securely injected into build output" -ForegroundColor Cyan
Write-Host "Source files remain safe with placeholders" -ForegroundColor Cyan
Write-Host ""
