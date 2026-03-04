# Flutter SMS Log Filter
# Run this to filter Flutter logs for SMS-related content

param(
    [switch]$CriticalOnly,
    [switch]$Verbose
)

Write-Host "🔍 Flutter SMS Log Filter" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Define SMS-related keywords
$SmsKeywords = @(
    "sms", "SMS", 
    "message", "Message",
    "telephony", "Telephony",
    "permission", "Permission",
    "channel", "Channel",
    "bridge", "Bridge",
    "darcie", "Darcie", "DARCIE",
    "received", "incoming",
    "flutter_inappwebview",
    "smsChannelManager",
    "SmsChannelManager"
)

# Critical keywords for critical-only mode
$CriticalKeywords = @(
    "ERROR", "CRITICAL", "FAILED", "EXCEPTION",
    "permission denied", "not found", "timeout"
)

# Start Flutter and process output
if ($CriticalOnly) {
    Write-Host "🚨 Critical-only mode enabled" -ForegroundColor Red
    flutter run --verbose 2>&1 | ForEach-Object {
        $line = $_.ToString()
        $timestamp = Get-Date -Format "HH:mm:ss.fff"
        
        # Check for critical SMS events
        foreach ($keyword in $CriticalKeywords) {
            if ($line -match $keyword) {
                foreach ($smsKeyword in $SmsKeywords) {
                    if ($line -match $smsKeyword) {
                        Write-Host "[$timestamp] [CRITICAL] $line" -ForegroundColor Red
                        break
                    }
                }
                break
            }
        }
    }
} else {
    Write-Host "📱 Showing all SMS-related logs" -ForegroundColor Green
    flutter run --verbose 2>&1 | ForEach-Object {
        $line = $_.ToString()
        $timestamp = Get-Date -Format "HH:mm:ss.fff"
        
        # Check for any SMS-related content
        foreach ($keyword in $SmsKeywords) {
            if ($line -match $keyword) {
                if ($line -match "ERROR|CRITICAL|FAILED") {
                    Write-Host "[$timestamp] [ERROR] $line" -ForegroundColor Red
                } elseif ($line -match "WARN|WARNING") {
                    Write-Host "[$timestamp] [WARN] $line" -ForegroundColor Yellow
                } else {
                    Write-Host "[$timestamp] [INFO] $line" -ForegroundColor White
                }
                break
            }
        }
    }
}
