import 'package:flutter/material.dart';
import 'package:firsttaps_mv3d/services/app_service.dart';

class AppPickerDialog extends StatefulWidget {
  final List<AppInfo> installedApps;
  final List<AppInfo> currentFavorites;
  final Function(List<AppInfo>) onAppSelected;

  const AppPickerDialog({
    super.key,
    required this.installedApps,
    required this.currentFavorites,
    required this.onAppSelected,
  });

  @override
  State<AppPickerDialog> createState() => _AppPickerDialogState();
}

class _AppPickerDialogState extends State<AppPickerDialog> {
  late List<AppInfo> _selectedApps;
  late List<AppInfo> _filteredApps;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedApps = List.from(widget.currentFavorites);
    _filteredApps = List.from(widget.installedApps);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterApps(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredApps = List.from(widget.installedApps);
      } else {
        _filteredApps = widget.installedApps
            .where(
              (app) => app.name.toLowerCase().contains(query.toLowerCase()),
            )
            .toList();
      }
    });
  }

  bool _isAppSelected(AppInfo app) {
    return _selectedApps.any(
      (selected) => selected.packageName == app.packageName,
    );
  }

  void _toggleApp(AppInfo app) {
    setState(() {
      if (_isAppSelected(app)) {
        _selectedApps.removeWhere(
          (selected) => selected.packageName == app.packageName,
        );
      } else {
        _selectedApps.add(app);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final usableScreenHeight = screenHeight - keyboardHeight;
    final dialogWidth = MediaQuery.of(context).size.width * 0.85;

    // Action buttons
    final actionButtons = [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      const SizedBox(width: 8),
      ElevatedButton(
        onPressed: _selectedApps.isNotEmpty
            ? () {
                widget.onAppSelected(_selectedApps);
                Navigator.pop(context);
              }
            : null,
        child: const Text('Add to World'),
      ),
    ];

    // Search field
    final searchField = TextField(
      controller: _searchController,
      autofocus: true,
      decoration: const InputDecoration(
        hintText: 'Search apps...',
        prefixIcon: Icon(Icons.search),
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
      onChanged: _filterApps,
    );

    // Selected count widget
    final selectedCountWidget = _selectedApps.isNotEmpty
        ? Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle, color: Colors.blue.shade700, size: 16),
                const SizedBox(width: 6),
                Text(
                  '${_selectedApps.length} selected',
                  style: TextStyle(
                    color: Colors.blue.shade700,
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          )
        : const SizedBox.shrink();

    // App list widget
    final appListWidget = _filteredApps.isEmpty
        ? const Center(
            child: Text(
              'No apps found',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          )
        : ListView.builder(
            itemCount: _filteredApps.length,
            itemBuilder: (context, index) {
              final app = _filteredApps[index];
              final isSelected = _isAppSelected(app);

              return Card(
                margin: const EdgeInsets.only(bottom: 8.0),
                child: ListTile(
                  dense: true,
                  visualDensity: VisualDensity.compact,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  leading: CircleAvatar(
                    radius: 18,
                    backgroundColor: isSelected ? Colors.blue : Colors.grey,
                    child: Icon(
                      isSelected ? Icons.check : Icons.android,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                  title: Text(
                    app.name,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                  subtitle: Text(
                    app.packageName,
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                  trailing: isSelected
                      ? const Icon(
                          Icons.check_circle,
                          color: Colors.blue,
                          size: 20,
                        )
                      : null,
                  onTap: () => _toggleApp(app),
                ),
              );
            },
          );

    return Dialog(
      insetPadding: EdgeInsets.zero,
      child: Container(
        margin: EdgeInsets.symmetric(
          horizontal: isLandscape ? 8 : 20,
          vertical: isLandscape ? 8 : 20,
        ),
        width: isLandscape ? screenWidth - 16 : dialogWidth,
        height: usableScreenHeight - (isLandscape ? 16 : 40),
        child: Material(
          elevation: 24,
          borderRadius: BorderRadius.circular(4),
          child: isLandscape
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Column 1: Title and action buttons
                    SizedBox(
                      width: 175,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Add Apps',
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const Spacer(),
                            // Action buttons at bottom of Column 1
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Cancel'),
                                ),
                                const SizedBox(height: 8),
                                ElevatedButton(
                                  onPressed: _selectedApps.isNotEmpty
                                      ? () {
                                          widget.onAppSelected(_selectedApps);
                                          Navigator.pop(context);
                                        }
                                      : null,
                                  child: const Text('Add to World'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const VerticalDivider(width: 1),
                    // Column 2: Search box and selected count
                    SizedBox(
                      width: 300,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            searchField,
                            const SizedBox(height: 8),
                            selectedCountWidget,
                          ],
                        ),
                      ),
                    ),
                    const VerticalDivider(width: 1),
                    // Column 3: App list
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: appListWidget,
                      ),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Title
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                      child: Text(
                        'Select Favorite Apps',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    const Divider(height: 1),
                    // Content - expanded to fill available space
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        child: Column(
                          children: [
                            searchField,
                            const SizedBox(height: 8),
                            selectedCountWidget,
                            const SizedBox(height: 8),
                            Expanded(child: appListWidget),
                          ],
                        ),
                      ),
                    ),
                    // Actions (portrait only)
                    const Divider(height: 1),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: actionButtons,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

/// Helper function to show the app picker dialog
Future<void> showAppPickerDialog(
  BuildContext context,
  List<AppInfo> installedApps,
  List<AppInfo> currentFavorites,
  Function(List<AppInfo>) onAppSelected,
) async {
  return showDialog(
    context: context,
    builder: (context) => AppPickerDialog(
      installedApps: installedApps,
      currentFavorites: currentFavorites,
      onAppSelected: onAppSelected,
    ),
  );
}
