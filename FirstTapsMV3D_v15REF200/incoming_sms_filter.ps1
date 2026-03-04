# Targeted filter for incoming SMS and message_received events
param(
    [string]$LogFile = "",
    [switch]$RealTime
)

if ($RealTime) {
    # Real-time filtering
    flutter logs | ForEach-Object {
        $line = $_
        if ($line -match "message_received|SENDING.*EVENT|incoming.*message|onNewMessage|📱.*🚨|MESSAGE_RECEIVED.*HANDLER|listenIncomingSms") {
            Write-Host $line -ForegroundColor Yellow
        }
    }
} else {
    # Filter existing log file or current logs
    $source = if ($LogFile) { Get-Content $LogFile } else { flutter logs }
    
    $source | Where-Object {
        $_ -match "message_received|SENDING.*EVENT|incoming.*message|onNewMessage|📱.*🚨|MESSAGE_RECEIVED.*HANDLER|listenIncomingSms"
    } | ForEach-Object {
        Write-Host $_ -ForegroundColor Cyan
    }
}
