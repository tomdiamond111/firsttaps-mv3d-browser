import 'package:flutter/material.dart';

class WorldOptionWidget extends StatelessWidget {
  final String worldType;
  final String title;
  final String description;
  final IconData icon;
  final String currentWorldType;
  final VoidCallback onTap;

  const WorldOptionWidget({
    super.key,
    required this.worldType,
    required this.title,
    required this.description,
    required this.icon,
    required this.currentWorldType,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bool isSelected = currentWorldType == worldType;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(
          color: isSelected ? Colors.blue : Colors.grey.shade300,
          width: isSelected ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(8),
        color: isSelected ? Colors.blue.shade50 : null,
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? Colors.blue : Colors.grey.shade600,
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.blue.shade800 : null,
          ),
        ),
        subtitle: Text(
          description,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            color: isSelected ? Colors.blue.shade600 : Colors.grey.shade600,
          ),
        ),
        trailing: isSelected
            ? const Icon(Icons.check_circle, color: Colors.blue)
            : null,
        onTap: onTap,
      ),
    );
  }
}
