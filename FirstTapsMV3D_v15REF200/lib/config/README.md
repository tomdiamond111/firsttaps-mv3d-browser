# API Keys Configuration

This directory contains API keys and tokens used by the FirstTaps MV3D application.

## 🔐 Security

**⚠️ IMPORTANT: Never commit `api_keys.dart` to version control!**

The `api_keys.dart` file is listed in `.gitignore` to prevent accidentally exposing sensitive credentials.

## 🚀 Setup Instructions

### First Time Setup

1. **Copy the template file:**
   ```bash
   cp lib/config/api_keys.dart.example lib/config/api_keys.dart
   ```

2. **Edit `api_keys.dart` and replace placeholder values:**
   - Open `lib/config/api_keys.dart`
   - Replace `YOUR_GITHUB_TOKEN_HERE` with your actual GitHub token
   - Save the file

3. **Verify it's ignored by git:**
   ```bash
   git status
   ```
   You should NOT see `api_keys.dart` in the list of changes.

### GitHub Personal Access Token

To enable furniture sharing via GitHub Gists:

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Token name: `FirstTaps MV3D Gist Upload`
4. Select **only** the `gist` scope (no other permissions needed)
5. Click **"Generate token"**
6. Copy the token (you won't see it again!)
7. Paste it into `lib/config/api_keys.dart` as the `githubToken` value

### Current Sharing Services

The app uses multiple paste services with automatic fallback:

1. **GitHub Gist** (primary) - Authenticated, reliable, private gists
2. **Hastebin** (backup) - Public pastes, simple API, no auth needed

If GitHub Gist fails or is not configured, the app automatically falls back to Hastebin.

## 📝 Adding New API Keys

To add a new API key to the application:

1. Add it to both `api_keys.dart.example` (with placeholder) and `api_keys.dart` (with real value):
   ```dart
   static const String myNewApiKey = 'YOUR_KEY_HERE';
   ```

2. Import and use it in your code:
   ```dart
   import 'package:firsttapsmv3d/config/api_keys.dart';
   
   final myKey = ApiKeys.myNewApiKey;
   ```

## ✅ File Status

- ✅ `api_keys.dart.example` - Template file (committed to git)
- ✅ `api_keys.dart` - Your actual keys (ignored by git)
- ✅ `README.md` - This documentation (committed to git)

## 🔍 Verify Configuration

After setting up, verify your tokens are working:

1. **GitHub Gist**: Try sharing a furniture piece - it should succeed with GitHub Gist
2. **Hastebin**: If GitHub fails, it should automatically try Hastebin

Check the Flutter logs to see which service was used:
```
✅ Upload successful via GitHub Gist: https://share.firsttaps.com/?gist=abc123
```
or
```
✅ Upload successful via Hastebin: https://share.firsttaps.com/?hastebin=xyz789
```
