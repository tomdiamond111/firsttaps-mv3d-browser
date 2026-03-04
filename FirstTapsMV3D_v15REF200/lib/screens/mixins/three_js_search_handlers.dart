import 'package:flutter/material.dart';
import '../../services/three_js_interop_service.dart';

/// Mixin containing all search functionality for ThreeJsScreen
///
/// This mixin provides:
/// - Search execution and management
/// - Search state handling
/// - Search UI feedback and notifications
/// - Search results processing
///
/// CRITICAL: All methods preserved exactly as original - no functionality changes
mixin ThreeJsSearchHandlers<T extends StatefulWidget> on State<T> {
  // Required getters that the main class must provide
  ThreeJsInteropService get threeJsInteropService;

  // Required search state getters that the main class must provide
  bool get isSearchActive;
  TextEditingController get searchController;
  FocusNode get searchFocusNode;
  int get searchResultsCount;

  // Required callback methods that the main class must provide
  void setSearchActive(bool active);
  void setSearchResultsCount(int count);
  void clearSearchController();

  /// Perform search with the given query
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> performSearch(String query) async {
    if (query.trim().isEmpty) {
      print('Search query is empty, ignoring search request');
      return;
    }

    print('🔍 Flutter: Performing search for: "${query.trim()}"');

    try {
      final success = await threeJsInteropService.activateSearch(query.trim());
      print(
        '🔍 Flutter: JS activateSearch returned: $success (type: ${success.runtimeType})',
      );

      if (success) {
        // Update search state
        print('🔍 Flutter: BEFORE STATE UPDATE - isActive: $isSearchActive');
        setSearchActive(true);
        print(
          '🔍 Flutter: AFTER setSearchActive(true) - isActive: $isSearchActive',
        );

        // Get search results count
        final resultsCount = await threeJsInteropService
            .getSearchResultsCount();
        print('🔍 Flutter: Got results count: $resultsCount');

        // Add a small delay and check again if count is 0 (potential timing issue)
        if (resultsCount == 0) {
          print('🔍 Flutter: Count is 0, waiting 100ms and trying again...');
          await Future.delayed(Duration(milliseconds: 100));
          final retryCount = await threeJsInteropService
              .getSearchResultsCount();
          print('🔍 Flutter: Retry count: $retryCount');

          print(
            '🔍 Flutter: BEFORE setSearchResultsCount - count: $searchResultsCount',
          );
          setSearchResultsCount(retryCount);
          print(
            '🔍 Flutter: AFTER setSearchResultsCount - count: $searchResultsCount',
          );
        } else {
          print(
            '🔍 Flutter: BEFORE setSearchResultsCount - count: $searchResultsCount',
          );
          setSearchResultsCount(resultsCount);
          print(
            '🔍 Flutter: AFTER setSearchResultsCount - count: $searchResultsCount',
          );
        }

        print(
          '🔍 Flutter: Search activated successfully. Found $resultsCount results.',
        );

        // Show feedback to user
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.search, color: Colors.white),
                  const SizedBox(width: 8),
                  Text(
                    'Found $resultsCount result${resultsCount == 1 ? '' : 's'} for "$query"',
                  ),
                ],
              ),
              backgroundColor: Colors.blue,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } else {
        print('🔍 Flutter: Search activation failed or no results found');
        // Error message removed - search will simply not show results if none found
      }
    } catch (e) {
      print('❌ Flutter: Error performing search: $e');
      // Error messages removed - search will simply not show results if there's an error
    }
  }

  /// Handle search input submission (Enter key or search button)
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> handleSearchSubmit() async {
    final query = searchController.text.trim();
    if (query.isNotEmpty) {
      // Unfocus the search field
      searchFocusNode.unfocus();

      // Perform the search
      await performSearch(query);
    }
  }

  /// Cancel/finish search mode
  ///
  /// CRITICAL: Exact copy of original method - preserves all functionality
  Future<void> finishSearch() async {
    print('Finishing search mode');

    try {
      final success = await threeJsInteropService.deactivateSearch();

      if (success) {
        // Update search state
        setSearchActive(false);
        setSearchResultsCount(0);

        // Clear search input
        clearSearchController();

        print('Search deactivated successfully');

        // Show feedback to user
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 8),
                  Text('All objects restored to original positions'),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else {
        print('Search deactivation failed');
      }
    } catch (e) {
      print('Error finishing search: $e');
    }
  }
}
