# Script to wrap console.log statements with DEBUG flag
# Skips console.error and console.warn statements

$files = @(
    "assets/web/js/modules/visuals/linkVisualManager.js",
    "assets/web/js/modules/branding/brandingService.js",
    "assets/web/js/modules/objects/virtualObjectCreators.js",
    "assets/web/js/modules/branding/brandManager.js"
)

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $filePath) {
        Write-Host "Processing $file..."
        
        # Read file content
        $content = Get-Content $filePath -Raw
        
        # Replace console.log statements (not already wrapped, not error/warn)
        # Pattern: Match indented console.log but not if (DEBUG) console.log pattern
        $content = $content -replace '(\s+)console\.log\(', '$1if (DEBUG) console.log('
        
        # Undo replacement for statements that are already wrapped (double-wrapped)
        $content = $content -replace 'if \(DEBUG\) if \(DEBUG\) console\.log\(', 'if (DEBUG) console.log('
        
        # Write back to file
        Set-Content $filePath -Value $content -NoNewline
        
        Write-Host "✓ Completed $file"
    } else {
        Write-Host "⚠ File not found: $file"
    }
}

Write-Host "`n✅ All files processed!"
