import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

class ZoomControl extends StatelessWidget {
  final VoidCallback onZoomIn;
  final VoidCallback onZoomOut;

  const ZoomControl({
    super.key,
    required this.onZoomIn,
    required this.onZoomOut,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            shape: const CircleBorder(),
            padding: const EdgeInsets.all(16),
            backgroundColor: Colors.white,
            elevation: 6,
          ),
          onPressed: onZoomIn,
          child: const Icon(CupertinoIcons.add, color: Colors.black),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            shape: const CircleBorder(),
            padding: const EdgeInsets.all(16),
            backgroundColor: Colors.white,
            elevation: 6,
          ),
          onPressed: onZoomOut,
          child: const Icon(CupertinoIcons.minus, color: Colors.black),
        ),
      ],
    );
  }
}
