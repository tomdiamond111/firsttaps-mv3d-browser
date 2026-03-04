import 'package:flutter/material.dart';
import 'home_control.dart';

class CameraControls extends StatelessWidget {
  final VoidCallback onHome;

  const CameraControls({super.key, required this.onHome});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(
        bottom: 16.0,
        right: 16.0, // Add right padding for landscape mode
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Home button
          HomeControl(onHome: onHome),
        ],
      ),
    );
  }
}
