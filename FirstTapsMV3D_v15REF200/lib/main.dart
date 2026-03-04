import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; // For SystemChrome immersive mode
import 'package:provider/provider.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:firsttaps_mv3d/controllers/home_page_controller.dart';
import 'package:firsttaps_mv3d/services/device_file_service.dart';
import 'package:firsttaps_mv3d/services/persistence_service.dart';
import 'package:firsttaps_mv3d/services/app_service.dart';
import 'package:firsttaps_mv3d/services/contact_sms_service.dart';
import 'package:firsttaps_mv3d/services/contact_dialer_service.dart';
import 'package:firsttaps_mv3d/services/premium_service.dart';
import 'package:firsttaps_mv3d/services/revenue_cat_service.dart';
import 'package:firsttaps_mv3d/services/music_search_service.dart';
import 'package:firsttaps_mv3d/sms/sms_channel_manager.dart';
import 'package:firsttaps_mv3d/screens/splash_screen.dart'; // Import SplashScreen instead of HomePage

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Enable immersive mode - hide navigation buttons, show only when user swipes up
  SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.immersiveSticky,
    overlays: [], // Hide both status bar and navigation buttons
  );

  // Initialize AdMob SDK
  try {
    await MobileAds.instance.initialize();
    print('📢 AdMob SDK initialized successfully');
  } catch (e) {
    print('❌ AdMob SDK initialization failed: $e');
  }

  // MV3D: SMS functionality DISABLED - Media-focused app
  // Contact objects retain phone/SMS via native apps only
  // SMS Channel Manager and Contact SMS Service are kept for future re-enablement
  final smsChannelManager = SmsChannelManager();
  bool smsInitialized = false;

  // DISABLED FOR MV3D - Uncomment to re-enable SMS features
  // try {
  //   smsInitialized = await smsChannelManager.initialize();
  //   print('📱 SMS Channel Manager initialized: $smsInitialized');
  // } catch (e) {
  //   print('❌ SMS Channel Manager initialization failed: $e');
  // }

  // DISABLED FOR MV3D - Uncomment to re-enable SMS features
  // try {
  //   await ContactSMSService.initialize();
  //   print('📱 Contact SMS Service initialized successfully');
  // } catch (e) {
  //   print('❌ Contact SMS Service initialization failed: $e');
  // }

  print('🎵 MV3D: SMS features disabled - Media organization focus');

  // Initialize Contact Dialer Service
  try {
    await ContactDialerService.initialize();
    print('📞 Contact Dialer Service initialized successfully');
  } catch (e) {
    print('❌ Contact Dialer Service initialization failed: $e');
  }

  // Initialize RevenueCat for subscription management
  try {
    await RevenueCatService().initialize();
    print('💰 RevenueCat Service initialized successfully');
  } catch (e) {
    print('❌ RevenueCat Service initialization failed: $e');
  }

  // Initialize Premium Service
  try {
    await PremiumService.instance.initialize();
    print('💎 Premium Service initialized successfully');
  } catch (e) {
    print('❌ Premium Service initialization failed: $e');
  }

  // Initialize Music Search Service with persistent YouTube quota tracking
  try {
    final musicSearchService = MusicSearchService();
    await musicSearchService.initialize();
    print('🎵 Music Search Service initialized with persistent quota tracking');
  } catch (e) {
    print('❌ Music Search Service initialization failed: $e');
  }

  runApp(WindowWorldApp(smsChannelManager: smsChannelManager));
}

class WindowWorldApp extends StatelessWidget {
  final SmsChannelManager smsChannelManager;

  const WindowWorldApp({super.key, required this.smsChannelManager});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<PersistenceService>(create: (_) => PersistenceService()),
        Provider<DeviceFileService>(create: (_) => DeviceFileService()),
        Provider<AppService>(create: (_) => AppService()),
        Provider<SmsChannelManager>.value(value: smsChannelManager),
        ChangeNotifierProvider<PremiumService>.value(
          value: PremiumService.instance,
        ),
        ChangeNotifierProvider<HomePageController>(
          create: (context) => HomePageController(
            persistenceService: context.read<PersistenceService>(),
            deviceFileService: context.read<DeviceFileService>(),
            appService: context.read<AppService>(),
          ),
        ),
      ],
      child: MaterialApp(
        title: 'WindowWorld 3D',
        theme: ThemeData.dark(),
        home:
            const SplashScreen(), // Start with SplashScreen instead of HomePage
      ),
    );
  }
}
