// lib/widgets/banner_ad_widget.dart
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'dart:io' show Platform;
import 'dart:developer' as developer;
import '../config/ad_config.dart';
import '../services/premium_service.dart';

/// Bottom banner ad widget
/// Shows AdMob banner ads for FREE tier users only
/// Premium subscribers never see ads
class BannerAdWidget extends StatefulWidget {
  const BannerAdWidget({super.key});

  @override
  State<BannerAdWidget> createState() => _BannerAdWidgetState();
}

class _BannerAdWidgetState extends State<BannerAdWidget> {
  BannerAd? _bannerAd;
  bool _isAdLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadAd();
  }

  /// Load the banner ad
  void _loadAd() {
    // Check if ads should be shown
    final premiumService = PremiumService.instance;

    if (!AdConfig.showBannerAds) {
      developer.log('Banner ads disabled by AdConfig', name: 'BannerAdWidget');
      return;
    }

    if (premiumService.isPremiumSubscriber) {
      developer.log('User is premium - no ads', name: 'BannerAdWidget');
      return;
    }

    // Get the appropriate ad unit ID
    String adUnitId;
    if (AdConfig.useTestAds) {
      // Use test ad IDs
      adUnitId = Platform.isAndroid
          ? 'ca-app-pub-3940256099942544/6300978111' // Android test banner
          : 'ca-app-pub-3940256099942544/2934735716'; // iOS test banner
    } else {
      // Use production ad IDs from config
      adUnitId = AdConfig.getBannerAdUnitId();
    }

    developer.log('Loading banner ad: $adUnitId', name: 'BannerAdWidget');

    // Create and load the banner ad
    _bannerAd = BannerAd(
      adUnitId: adUnitId,
      size: AdSize.banner, // Standard 320x50 banner
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          developer.log('✅ Banner ad loaded', name: 'BannerAdWidget');
          setState(() {
            _isAdLoaded = true;
          });
        },
        onAdFailedToLoad: (ad, error) {
          developer.log(
            '❌ Banner ad failed to load: ${error.message}',
            name: 'BannerAdWidget',
          );
          ad.dispose();
          setState(() {
            _bannerAd = null;
            _isAdLoaded = false;
          });
        },
        onAdOpened: (ad) {
          developer.log('📱 Banner ad opened', name: 'BannerAdWidget');
        },
        onAdClosed: (ad) {
          developer.log('Banner ad closed', name: 'BannerAdWidget');
        },
      ),
    );

    _bannerAd?.load();
  }

  @override
  void dispose() {
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final premiumService = PremiumService.instance;

    // Don't show ads if:
    // 1. Ads are disabled globally (AdConfig.showBannerAds = false)
    // 2. User has premium subscription
    if (!AdConfig.showBannerAds || premiumService.isPremiumSubscriber) {
      return const SizedBox.shrink(); // Return empty widget
    }

    // Show ad container
    if (_isAdLoaded && _bannerAd != null) {
      return Container(
        alignment: Alignment.center,
        width: _bannerAd!.size.width.toDouble(),
        height: _bannerAd!.size.height.toDouble(),
        color: Colors.black12,
        child: AdWidget(ad: _bannerAd!),
      );
    }

    // Show placeholder while loading or if ad failed
    return Container(
      alignment: Alignment.center,
      width: 320,
      height: 50,
      color: Colors.black12,
      child: const SizedBox.shrink(), // Empty space reserved for ad
    );
  }
}
