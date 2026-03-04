import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Debug utility to inspect and clean furniture data
/// Run this with: dart run lib/debug_furniture_data.dart
void main() async {
  print('🪑 ========================================');
  print('🪑 FURNITURE DATA DEBUG UTILITY');
  print('🪑 ========================================\n');

  try {
    final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
    final String? furnitureData = await asyncPrefs.getString('furnitureData');

    if (furnitureData == null || furnitureData.isEmpty) {
      print('❌ No furniture data found in SharedPreferences');
      return;
    }

    print('📊 Raw data length: ${furnitureData.length} characters\n');

    // Parse the JSON
    final Map<String, dynamic> data = jsonDecode(furnitureData);

    if (!data.containsKey('furniture') || data['furniture'] is! List) {
      print('❌ Invalid furniture data structure');
      return;
    }

    final List furniture = data['furniture'];
    print('🪑 Total furniture pieces: ${furniture.length}\n');
    print('=' * 80);

    // Analyze each furniture piece
    for (int i = 0; i < furniture.length; i++) {
      final piece = furniture[i];
      print('\n🪑 FURNITURE #${i + 1}:');
      print('  ID: ${piece['id']}');
      print('  Type: ${piece['type']}');
      print('  Capacity: ${piece['capacity']}');
      print('  World Type: ${piece['worldType']}');

      if (piece['objectIds'] != null) {
        final List objectIds = piece['objectIds'];
        final int occupiedCount = objectIds.where((id) => id != null).length;
        print('  Occupied Slots: $occupiedCount / ${objectIds.length}');

        // Show all occupied slots
        if (occupiedCount > 0) {
          print('  Objects:');
          for (int slotIdx = 0; slotIdx < objectIds.length; slotIdx++) {
            if (objectIds[slotIdx] != null) {
              print('    Slot $slotIdx: ${objectIds[slotIdx]}');
            }
          }
        }
      }
      print('  ' + '-' * 76);
    }

    print('\n' + '=' * 80);
    print('\n🔧 CLEANUP OPTIONS:');
    print(
      '1. To remove ALL furniture data, run: await cleanAllFurnitureData()',
    );
    print(
      '2. To remove specific furniture, run: await removeFurniture("furniture-id")',
    );
    print('3. To fix slot collisions, run: await fixSlotCollisions()');
  } catch (e, stackTrace) {
    print('❌ Error reading furniture data: $e');
    print('Stack trace: $stackTrace');
  }
}

/// Remove all furniture data from SharedPreferences
Future<void> cleanAllFurnitureData() async {
  final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
  await asyncPrefs.remove('furnitureData');
  print('✅ All furniture data removed');
}

/// Remove specific furniture by ID
Future<void> removeFurniture(String furnitureId) async {
  try {
    final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
    final String? furnitureData = await asyncPrefs.getString('furnitureData');

    if (furnitureData == null || furnitureData.isEmpty) {
      print('❌ No furniture data found');
      return;
    }

    final Map<String, dynamic> data = jsonDecode(furnitureData);
    final List furniture = data['furniture'];

    // Remove the specified furniture
    furniture.removeWhere((piece) => piece['id'] == furnitureId);

    // Save back
    final String updatedData = jsonEncode(data);
    await asyncPrefs.setString('furnitureData', updatedData);

    print('✅ Removed furniture: $furnitureId');
    print('📊 Remaining furniture: ${furniture.length}');
  } catch (e) {
    print('❌ Error removing furniture: $e');
  }
}

/// Fix slot collision issues by removing duplicate slot assignments
Future<void> fixSlotCollisions() async {
  try {
    final SharedPreferencesAsync asyncPrefs = SharedPreferencesAsync();
    final String? furnitureData = await asyncPrefs.getString('furnitureData');

    if (furnitureData == null || furnitureData.isEmpty) {
      print('❌ No furniture data found');
      return;
    }

    final Map<String, dynamic> data = jsonDecode(furnitureData);
    final List furniture = data['furniture'];

    int fixedCount = 0;

    for (var piece in furniture) {
      if (piece['objectIds'] == null) continue;

      final List objectIds = piece['objectIds'];
      final Set<dynamic> seenObjects = {};

      // Clear duplicate object assignments
      for (int i = 0; i < objectIds.length; i++) {
        if (objectIds[i] != null) {
          if (seenObjects.contains(objectIds[i])) {
            print(
              '🔧 Fixing duplicate: ${objectIds[i]} at slot $i in ${piece['id']}',
            );
            objectIds[i] = null;
            fixedCount++;
          } else {
            seenObjects.add(objectIds[i]);
          }
        }
      }
    }

    // Save back
    if (fixedCount > 0) {
      final String updatedData = jsonEncode(data);
      await asyncPrefs.setString('furnitureData', updatedData);
      print('✅ Fixed $fixedCount slot collision(s)');
    } else {
      print('✅ No slot collisions found');
    }
  } catch (e) {
    print('❌ Error fixing slot collisions: $e');
  }
}
