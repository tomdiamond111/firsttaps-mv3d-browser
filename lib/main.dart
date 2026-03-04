import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firsttaps_mv3d_browser/screens/world_view_screen.dart';
import 'package:firsttaps_mv3d_browser/services/storage_service.dart';
import 'package:firsttaps_mv3d_browser/services/remote_config_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  print('🌐 FirstTaps MV3D Web - Browser Version Starting...');
  print('💾 Using localStorage for persistence (no backend required)');

  // Initialize storage service
  final storageService = StorageService();
  await storageService.initialize();

  // RemoteConfigService uses static methods - no initialization needed
  print('📡 RemoteConfigService ready (fetches on-demand from GitHub)');

  runApp(
    MultiProvider(
      providers: [ChangeNotifierProvider.value(value: storageService)],
      child: const FirstTapsMV3DWebApp(),
    ),
  );
}

class FirstTapsMV3DWebApp extends StatelessWidget {
  const FirstTapsMV3DWebApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FirstTaps MV3D Web',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const WorldViewScreen(),
    );
  }
}
