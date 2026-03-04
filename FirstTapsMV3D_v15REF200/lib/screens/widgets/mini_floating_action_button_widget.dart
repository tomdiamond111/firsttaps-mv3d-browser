import 'package:flutter/material.dart';

class MiniFloatingActionButtonWidget extends StatelessWidget {
  final VoidCallback onPressed;
  final IconData icon;

  const MiniFloatingActionButtonWidget({
    super.key,
    required this.onPressed,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      mini: true,
      backgroundColor: Colors.black.withOpacity(0.7),
      foregroundColor: Colors.white,
      onPressed: onPressed,
      child: Icon(icon),
    );
  }
}
