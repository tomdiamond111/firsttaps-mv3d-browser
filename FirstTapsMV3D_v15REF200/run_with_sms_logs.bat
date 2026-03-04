@echo off
echo Starting Flutter with SMS log filtering...
echo.
echo This will show only SMS-related logs from Flutter
echo.

REM Run Flutter and filter for SMS-related logs
flutter run --verbose | findstr /i "sms message telephony permission channel bridge darcie received incoming"

pause
