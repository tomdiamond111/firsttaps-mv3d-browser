import 'package:flutter/material.dart';

class CancelButtonWidget extends StatelessWidget {
  final VoidCallback? onPressed;
  final bool useWhiteText;

  const CancelButtonWidget({
    super.key,
    this.onPressed,
    this.useWhiteText = false,
  });

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed ?? () => Navigator.of(context).pop(),
      child: Text(
        'Cancel',
        style: useWhiteText ? const TextStyle(color: Colors.white) : null,
      ),
    );
  }
}
