# AdMob Production Setup Guide

## Current Status
✅ AdMob SDK integrated (v5.3.1)
✅ Test ads working properly
✅ Banner ad visible only for FREE tier users
✅ Premium subscribers see no ads
⏳ **NEXT STEP: Replace test IDs with your production AdMob IDs**

---

## Step 1: Create Your AdMob Account

1. Go to [https://admob.google.com](https://admob.google.com)
2. Sign in with your Google account
3. Complete the AdMob account setup

---

## Step 2: Register Your App in AdMob

### For Android:
1. In AdMob console, click **Apps** → **Add App**
2. Select **Android** platform
3. Choose "Yes, my app is listed on a supported app store"
4. Enter your app's package name: `com.firsttaps.firsttapsmv3d`
5. Enter app name: "FirstTaps MV3D"
6. Click **Add App**
7. **Copy your Android App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

### For iOS:
1. In AdMob console, click **Apps** → **Add App**
2. Select **iOS** platform
3. Choose "Yes, my app is listed on a supported app store"  
4. Enter your app's bundle ID (check `ios/Runner/Info.plist` for exact value)
5. Enter app name: "FirstTaps MV3D"
6. Click **Add App**
7. **Copy your iOS App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ`)

---

## Step 3: Create Ad Units

### For Android Banner Ad:
1. Select your Android app in AdMob console
2. Click **Ad Units** → **Add Ad Unit**
3. Select **Banner** ad format
4. Name it: "Android Homepage Banner"
5. Click **Create Ad Unit**
6. **Copy your Android Banner Ad Unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/1111111111`)

### For iOS Banner Ad:
1. Select your iOS app in AdMob console
2. Click **Ad Units** → **Add Ad Unit**
3. Select **Banner** ad format
4. Name it: "iOS Homepage Banner"
5. Click **Create Ad Unit**
6. **Copy your iOS Banner Ad Unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/2222222222`)

---

## Step 4: Update Your App Configuration

You now have 4 IDs to replace:

1. **Android App ID** (from Step 2)
2. **iOS App ID** (from Step 2)
3. **Android Banner Ad Unit ID** (from Step 3)
4. **iOS Banner Ad Unit ID** (from Step 3)

### File 1: `lib/config/ad_config.dart`

```dart
class AdConfig {
  /// Master switch for banner ads
  static const bool showBannerAds = true; // Keep as true for production

  /// Test mode - uses AdMob test ad units
  static const bool useTestAds = false; // ⬅️ CHANGE THIS TO false

  /// Ad Unit IDs - REPLACE WITH YOUR REAL IDS
  static const String androidBannerAdUnitId =
      'ca-app-pub-XXXXXXXXXXXXXXXX/1111111111'; // ⬅️ PASTE YOUR ANDROID BANNER AD UNIT ID
  static const String iosBannerAdUnitId =
      'ca-app-pub-XXXXXXXXXXXXXXXX/2222222222'; // ⬅️ PASTE YOUR iOS BANNER AD UNIT ID

  static String getBannerAdUnitId() {
    return androidBannerAdUnitId;
  }
}
```

### File 2: `android/app/src/main/AndroidManifest.xml`

Find this line:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713"/>
```

Change the `android:value` to your **Android App ID** from Step 2:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

### File 3: `ios/Runner/Info.plist`

Find this block:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-3940256099942544~1458002511</string>
```

Change the `<string>` value to your **iOS App ID** from Step 2:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ</string>
```

---

## Step 5: Test Real Ads

### Important Testing Notes:
- **Use a real device**, not an emulator
- Real ads may take a few minutes to start showing after first launch
- If you see a blank space where the ad should be, it means:
  - AdMob is still processing your app (wait 1-2 hours)
  - Your ad units are not approved yet (check AdMob console)
  - Your app is not published yet (some ad types require published apps)

### Testing Checklist:
1. Clean build: `flutter clean`
2. Rebuild app: `flutter build android --release`
3. Install on REAL device (not emulator)
4. Launch app
5. Log in as FREE tier user (not Premium)
6. Check bottom of screen for banner ad
7. Verify Premium users still see NO ads

---

## Step 6: Monitor Ad Performance

1. Open AdMob console
2. Go to your app
3. Click **Reporting** tab
4. Monitor these metrics:
   - **Impressions** (how many times ads were shown)
   - **Clicks** (how many times users clicked ads)
   - **Estimated earnings** (your revenue)
   - **Fill rate** (how often AdMob had an ad to show)

---

## Troubleshooting

### "I see blank space instead of ads"
**Solution:**
- Wait 1-2 hours after first setup
- Check AdMob console for ad unit approval status
- Verify all 4 IDs are correct
- Ensure `useTestAds = false` in ad_config.dart
- Test on real device, not emulator

### "Ads not showing for FREE users"
**Solution:**
- Check `AdConfig.showBannerAds` is `true`
- Verify user is logged out of Premium account
- Check Flutter console for error messages
- Verify banner ad widget is rendered (check UI tree)

### "Premium users still see ads"
**Solution:**
- Check `PremiumService.isPremiumSubscriber` returns `true`
- Verify RevenueCat subscription is active
- Check banner_ad_widget.dart logic

### "App crashes on startup"
**Solution:**
- Verify App IDs in AndroidManifest.xml and Info.plist are correct
- Ensure Ad Unit IDs in ad_config.dart are correct
- Check Flutter console for initialization errors

---

## Test Ad vs Real Ad Comparison

| Feature | Test Ads (Current) | Real Ads (After Setup) |
|---------|-------------------|------------------------|
| Ad Content | Google test ads | Real advertiser ads |
| Earnings | $0 (no revenue) | Real revenue |
| Fill Rate | 100% (always shows) | Depends on demand |
| Testing | Safe for development | Use real device only |
| AdMob Policy | Always allowed | Must follow policies |

---

## AdMob Policy Compliance

⚠️ **IMPORTANT:** Ensure your app complies with AdMob policies:

1. **No click fraud** - Don't encourage users to click ads
2. **No self-clicks** - Don't click your own ads
3. **No ad placement manipulation** - Don't hide/mislead ad areas
4. **Privacy policy required** - Must have privacy policy URL
5. **Children's app compliance** - If targeting children, follow COPPA

Learn more: [AdMob Program Policies](https://support.google.com/admob/answer/6128543)

---

## Expected Timeline

- **Hour 0**: Complete setup above
- **Hour 1-2**: AdMob processes new app registration
- **Hour 2-24**: First real ads may appear
- **Day 1-3**: Ad fill rate stabilizes
- **Week 1+**: Ad performance data becomes meaningful

---

## Summary Checklist

- [ ] Created AdMob account
- [ ] Registered Android app in AdMob
- [ ] Registered iOS app in AdMob
- [ ] Created Android Banner Ad Unit
- [ ] Created iOS Banner Ad Unit
- [ ] Updated `ad_config.dart` with real Ad Unit IDs
- [ ] Changed `useTestAds = false` in `ad_config.dart`
- [ ] Updated `AndroidManifest.xml` with Android App ID
- [ ] Updated `Info.plist` with iOS App ID
- [ ] Tested on real device as FREE user
- [ ] Verified Premium users see NO ads
- [ ] Monitoring AdMob dashboard for impressions

---

## Need Help?

If you encounter issues:
1. Check Flutter console for error messages
2. Verify all IDs are correct (no typos)
3. Wait 1-2 hours after initial setup
4. Check AdMob console for approval status
5. Test on real device, not emulator

---

**Current Test Ad IDs (for reference):**
- Android Test App ID: `ca-app-pub-3940256099942544~3347511713`
- iOS Test App ID: `ca-app-pub-3940256099942544~1458002511`
- Android Test Banner: `ca-app-pub-3940256099942544/6300978111`
- iOS Test Banner: `ca-app-pub-3940256099942544/2934735716`

**These will be replaced with your real IDs after completing the setup above.**
