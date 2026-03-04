import 'package:flutter/material.dart';

class PremiumWorldOptionWidget extends StatelessWidget {
  final String worldType;
  final String title;
  final String description;
  final IconData icon;
  final String currentWorldType;
  final bool isUnlocked;
  final VoidCallback onTap;

  const PremiumWorldOptionWidget({
    super.key,
    required this.worldType,
    required this.title,
    required this.description,
    required this.icon,
    required this.currentWorldType,
    required this.isUnlocked,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bool isSelected = currentWorldType == worldType;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(
          color: isSelected
              ? Colors.amber
              : isUnlocked
              ? Colors.amber.shade300
              : Colors.grey.shade300,
          width: isSelected ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(8),
        color: isSelected
            ? Colors.amber.shade50
            : isUnlocked
            ? null
            : Colors.grey.shade100,
      ),
      child: Stack(
        children: [
          ListTile(
            leading: Icon(
              icon,
              color: isSelected
                  ? Colors.amber.shade800
                  : isUnlocked
                  ? Colors.amber.shade600
                  : Colors.grey.shade400,
            ),
            title: Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                      color: isSelected
                          ? Colors.amber.shade800
                          : isUnlocked
                          ? null
                          : Colors.grey.shade500,
                    ),
                  ),
                ),
                if (!isUnlocked)
                  Icon(Icons.lock, size: 16, color: Colors.grey.shade500),
              ],
            ),
            subtitle: Text(
              isUnlocked ? description : 'Premium feature - Upgrade to unlock',
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                color: isSelected
                    ? Colors.amber.shade600
                    : isUnlocked
                    ? Colors.grey.shade600
                    : Colors.grey.shade500,
              ),
            ),
            trailing: isSelected
                ? Icon(Icons.check_circle, color: Colors.amber.shade800)
                : !isUnlocked
                ? Icon(Icons.star, color: Colors.amber.shade600, size: 20)
                : null,
            onTap: onTap,
          ),
          if (!isUnlocked)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.amber,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'PRO',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
