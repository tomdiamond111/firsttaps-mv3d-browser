import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

class HomeControl extends StatelessWidget {
  final VoidCallback onHome;

  const HomeControl({super.key, required this.onHome});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        shape: const CircleBorder(),
        padding: const EdgeInsets.all(16),
        backgroundColor: Colors.white,
        elevation: 6,
      ),
      onPressed: onHome,
      child: const Icon(CupertinoIcons.house, color: Colors.black),
    );
  }
}
