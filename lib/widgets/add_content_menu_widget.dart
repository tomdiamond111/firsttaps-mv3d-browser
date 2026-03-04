import 'package:flutter/material.dart';

/// Widget for the Add Content menu popup
/// Shows all options for adding content to the 3D world (browser version)
class AddContentMenuWidget extends StatefulWidget {
  final VoidCallback onSearchMusic;
  final VoidCallback onAddLink;
  final VoidCallback onAddFurniture;
  final VoidCallback onOpenFurnitureManager;

  const AddContentMenuWidget({
    super.key,
    required this.onSearchMusic,
    required this.onAddLink,
    required this.onAddFurniture,
    required this.onOpenFurnitureManager,
  });

  @override
  State<AddContentMenuWidget> createState() => _AddContentMenuWidgetState();
}

class _AddContentMenuWidgetState extends State<AddContentMenuWidget> {
  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final maxHeight = screenHeight * 0.8; // Use 80% of screen height

    return MouseRegion(
      cursor: SystemMouseCursors.basic,
      child: Container(
        constraints: BoxConstraints(maxWidth: 320, maxHeight: maxHeight),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.1), width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 20,
              spreadRadius: 5,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF2A2A2A), Color(0xFF1E1E1E)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.add_circle,
                      color: Colors.green,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Add Content',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
            Container(height: 1, color: Colors.white.withOpacity(0.08)),

            // Scrollable content area
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // ADD MEDIA SECTION
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'ADD MEDIA',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.5),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Search Music/Videos Option
                    _buildMenuItem(
                      context,
                      icon: Icons.search,
                      iconColor: Colors.red,
                      label: 'Search Music/Videos',
                      onTap: widget.onSearchMusic,
                    ),

                    // Add Link/URL Option
                    _buildMenuItem(
                      context,
                      icon: Icons.link,
                      iconColor: Colors.cyan,
                      label: 'Paste Link/URL',
                      onTap: widget.onAddLink,
                    ),

                    // ADD/EDIT PLAYLISTS SECTION
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'ADD/EDIT PLAYLISTS',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.5),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Create Furniture Option
                    _buildMenuItem(
                      context,
                      icon: Icons.weekend,
                      iconColor: Colors.orange,
                      label: 'Create Furniture',
                      onTap: widget.onAddFurniture,
                    ),

                    // Furniture Manager Option
                    _buildMenuItem(
                      context,
                      icon: Icons.dashboard,
                      iconColor: Colors.blueGrey,
                      label: 'Furniture Manager',
                      onTap: widget.onOpenFurnitureManager,
                    ),

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),

            Container(height: 1, color: Colors.white.withOpacity(0.08)),

            // Cancel Option
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => Navigator.pop(context),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.close,
                        color: Colors.white.withOpacity(0.6),
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Cancel',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.6),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String label,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Material(
        color: const Color(0xFF2A2A2A),
        borderRadius: BorderRadius.circular(12),
        elevation: 2,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              border: Border.all(color: iconColor.withOpacity(0.2), width: 1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: iconColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: iconColor, size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.white.withOpacity(0.3),
                  size: 14,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
