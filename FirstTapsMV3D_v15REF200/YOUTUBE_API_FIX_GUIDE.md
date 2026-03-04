# YouTube API 403 Error - Fix Guide

## Problem
When using the "Add Music/Video" feature, you get the error:
```
Failed to search youtube: 403  try again
```

## Root Cause
The YouTube API key has **Application Restrictions** that block requests. The specific error is:
```
Requests from this Android client application <empty> are blocked.
```

## Solution Options

### Option 1: Remove Application Restrictions (Fastest Fix)

**⚠️ Warning:** This makes the API key accessible from anywhere. Only use for development/testing.

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key (currently: `AIzaSyCCG_qmLjFhFbQ2YysRaFJF-g27qrd_qG8`)
3. Under **"Application restrictions"**, select **"None"**
4. Click **"Save"**
5. Wait 1-2 minutes for changes to propagate
6. Try the search again in your app

### Option 2: Configure Android App Restrictions (Production Fix)

This properly restricts the API key to only work with your specific app.

#### Step 1: Get Your App's SHA-1 Certificate Fingerprint

For **Debug Build**:
```powershell
cd android
.\gradlew signingReport
```

Look for output like:
```
Variant: debug
Config: debug
Store: C:\Users\yourusername\.android\debug.keystore
Alias: AndroidDebugKey
MD5: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
SHA-256: ...
```

Copy the **SHA1** value.

For **Release Build**: 
- Use the keystore from `android/key.properties`
- Or use the SHA-1 from your Play Console

#### Step 2: Configure API Key

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Under **"Application restrictions"**:
   - Select **"Android apps"**
   - Click **"Add an item"**
4. Enter:
   - **Package name**: `com.firsttaps.firsttapsmv3d`
   - **SHA-1 certificate fingerprint**: (paste the SHA-1 from Step 1)
5. Click **"Done"**, then **"Save"**
6. Wait 1-2 minutes for changes to propagate
7. Try the search again in your app

### Option 3: Create a New Unrestricted API Key (Quick Development Fix)

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. Copy the new API key
4. Update `lib/services/music_search_service.dart`:
   ```dart
   static const String _youtubeApiKey = 'YOUR_NEW_API_KEY_HERE';
   ```
5. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check **"YouTube Data API v3"**
   - Click **"Save"**
6. Try the search again

## Verify the Fix

After applying any fix above, run the diagnostic tool:

```powershell
dart youtube_api_test.dart
```

You should see:
```
✅ SUCCESS! YouTube API is working correctly.
```

## Additional Troubleshooting

### Error: "YouTube Data API v3 is not enabled"
1. Visit [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
2. Click **"ENABLE"**
3. Wait 30 seconds
4. Try again

### Error: "Daily search limit reached"
- Your API has hit the 10,000 units/day quota
- Each search costs 100 units = max 100 searches/day
- Wait until tomorrow (resets at midnight Pacific Time)
- Or request quota increase in Google Cloud Console

### Error: "API key error"
- The API key may be invalid or deleted
- Create a new API key (Option 3 above)

## Important Files

- API Service: `lib/services/music_search_service.dart`
- Diagnostic Tool: `youtube_api_test.dart`
- Model: `lib/models/music_search_result.dart`
- UI Screen: `lib/screens/music_search_screen.dart`

## Links

- [Google Cloud Console Dashboard](https://console.cloud.google.com/apis/dashboard)
- [API Credentials](https://console.cloud.google.com/apis/credentials)
- [YouTube Data API v3 Library](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
- [Quota Usage](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)
- [YouTube API Documentation](https://developers.google.com/youtube/v3/getting-started)

---

## Quick Command Reference

```powershell
# Test API connection
dart youtube_api_test.dart

# Get SHA-1 fingerprint
cd android
.\gradlew signingReport

# Run app in debug mode
flutter run

# Check for errors
flutter analyze
```
