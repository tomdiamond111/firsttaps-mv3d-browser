import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter/webview_flutter.dart';

/// Service for importing shared furniture playlists from deep links or import codes
///
/// Handles:
/// - Deep link parsing (firsttapsmv3d://import-furniture?gist=ABCD1234)
/// - Fetching furniture data from paste services (GitHub Gist, termbin, paste.rs, etc.)
/// - Decompressing LZ-String data
/// - Creating furniture and objects in the 3D world
/// - Ensuring imported objects behave identically to native objects
class FurnitureImportService {
  final WebViewController webViewController;

  FurnitureImportService(this.webViewController);

  /// Import furniture from a deep link URI
  /// Returns true if successful, false otherwise
  Future<bool> importFromDeepLink(Uri uri) async {
    try {
      print('📥 [IMPORT] Processing deep link: $uri');

      // Parse paste ID from query parameters
      String? pasteId;
      String? pasteService;

      if (uri.queryParameters.containsKey('gist')) {
        pasteId = uri.queryParameters['gist'];
        pasteService = 'gist';
      } else if (uri.queryParameters.containsKey('pastesio')) {
        pasteId = uri.queryParameters['pastesio'];
        pasteService = 'pastesio';
      } else if (uri.queryParameters.containsKey('rentry')) {
        pasteId = uri.queryParameters['rentry'];
        pasteService = 'rentry';
      } else if (uri.queryParameters.containsKey('termbin')) {
        pasteId = uri.queryParameters['termbin'];
        pasteService = 'termbin';
      } else if (uri.queryParameters.containsKey('paste')) {
        pasteId = uri.queryParameters['paste'];
        pasteService = 'dpaste';
      } else if (uri.queryParameters.containsKey('dpaste')) {
        pasteId = uri.queryParameters['dpaste'];
        pasteService = 'dpaste';
      } else if (uri.queryParameters.containsKey('pasters')) {
        pasteId = uri.queryParameters['pasters'];
        pasteService = 'pasters';
      } else if (uri.queryParameters.containsKey('ox0st')) {
        pasteId = uri.queryParameters['ox0st'];
        pasteService = 'ox0st';
      } else if (uri.queryParameters.containsKey('pastegg')) {
        pasteId = uri.queryParameters['pastegg'];
        pasteService = 'pastegg';
      } else if (uri.queryParameters.containsKey('ixio')) {
        pasteId = uri.queryParameters['ixio'];
        pasteService = 'ixio';
      } else if (uri.queryParameters.containsKey('hastebin')) {
        pasteId = uri.queryParameters['hastebin'];
        pasteService = 'hastebin';
      } else if (uri.queryParameters.containsKey('bin')) {
        pasteId = uri.queryParameters['bin'];
        pasteService = 'jsonbin';
      }

      if (pasteId == null || pasteService == null) {
        print('❌ [IMPORT] No valid paste ID found in deep link');
        return false;
      }

      print('📥 [IMPORT] Paste ID: $pasteId, Service: $pasteService');

      // Import the furniture
      return await importFromPasteId(pasteId, pasteService);
    } catch (e) {
      print('❌ [IMPORT] Error processing deep link: $e');
      return false;
    }
  }

  /// Import furniture from a paste ID
  /// pasteService: 'dpaste', 'rentry', or 'jsonbin'
  Future<bool> importFromPasteId(String pasteId, String pasteService) async {
    try {
      print('📥 [IMPORT] Fetching furniture data from $pasteService...');

      // Fetch compressed data from paste service
      String compressedData;

      switch (pasteService) {
        case 'gist':
          compressedData = await _fetchFromGitHubGist(pasteId);
          break;
        case 'pastesio':
          compressedData = await _fetchFromPastesIo(pasteId);
          break;
        case 'rentry':
          compressedData = await _fetchFromRentry(pasteId);
          break;
        case 'termbin':
          compressedData = await _fetchFromTermbin(pasteId);
          break;
        case 'dpaste':
          compressedData = await _fetchFromDpaste(pasteId);
          break;
        case 'pasters':
          compressedData = await _fetchFromPasteRs(pasteId);
          break;
        case 'ox0st':
          compressedData = await _fetchFrom0x0st(pasteId);
          break;
        case 'pastegg':
          compressedData = await _fetchFromPasteGg(pasteId);
          break;
        case 'ixio':
          compressedData = await _fetchFromIxIo(pasteId);
          break;
        case 'hastebin':
          compressedData = await _fetchFromHastebin(pasteId);
          break;
        case 'jsonbin':
          compressedData = await _fetchFromJsonbin(pasteId);
          break;
        default:
          throw Exception('Unknown paste service: $pasteService');
      }

      if (compressedData.isEmpty) {
        print('❌ [IMPORT] Failed to fetch furniture data');
        return false;
      }

      print(
        '📥 [IMPORT] Data fetched, length: ${compressedData.length} characters',
      );

      // Decompress and parse furniture data in JavaScript
      // This ensures we use the same decompression logic as the viewer
      final result = await webViewController.runJavaScriptReturningResult('''
        (async function() {
          try {
            console.log('📥 [IMPORT JS] Starting import process...');
            
            const compressedData = ${jsonEncode(compressedData)};
            console.log('📥 [IMPORT JS] Compressed data length:', compressedData.length);
            
            // Decompress using LZ-String (same as viewer)
            let decompressed;
            if (window.LZString) {
              decompressed = window.LZString.decompressFromEncodedURIComponent(compressedData);
              if (!decompressed) {
                // Try base64 fallback
                decompressed = decodeURIComponent(atob(compressedData));
              }
            } else {
              decompressed = decodeURIComponent(atob(compressedData));
            }
            
            console.log('📥 [IMPORT JS] Decompressed data length:', decompressed.length);
            
            // Parse JSON
            const furnitureData = JSON.parse(decompressed);
            console.log('📥 [IMPORT JS] Furniture data parsed:', furnitureData);
            
            // Validate data structure
            if (!furnitureData.furniture || !furnitureData.objects) {
              throw new Error('Invalid furniture data structure');
            }
            
            return JSON.stringify({ success: true, data: furnitureData });
          } catch (error) {
            console.error('❌ [IMPORT JS] Error:', error);
            return JSON.stringify({ success: false, error: error.message });
          }
        })();
      ''');

      print('📥 [IMPORT] JavaScript result: $result');

      // Parse result
      final resultMap = jsonDecode(result.toString());
      if (resultMap['success'] != true) {
        print('❌ [IMPORT] JavaScript import failed: ${resultMap['error']}');
        return false;
      }

      final furnitureData = resultMap['data'];
      print('📥 [IMPORT] Furniture data validated');

      // Create furniture in the 3D world
      final created = await _createImportedFurniture(furnitureData);

      if (created) {
        print('✅ [IMPORT] Furniture imported successfully!');
      } else {
        print('❌ [IMPORT] Failed to create furniture');
      }

      return created;
    } catch (e) {
      print('❌ [IMPORT] Error importing furniture: $e');
      return false;
    }
  }

  /// Fetch data from dpaste.com
  Future<String> _fetchFromDpaste(String pasteId) async {
    try {
      final url = 'https://dpaste.com/$pasteId.txt';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return response.body.trim();
      } else {
        throw Exception('Failed to fetch from dpaste: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [IMPORT] dpaste fetch error: $e');
      return '';
    }
  }

  /// Fetch data from GitHub Gist
  Future<String> _fetchFromGitHubGist(String gistId) async {
    try {
      final url = 'https://api.github.com/gists/$gistId';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(
            Uri.parse(url),
            headers: {'Accept': 'application/vnd.github+json'},
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // Get the first file's content from the gist
        final files = data['files'] as Map<String, dynamic>;
        final firstFile = files.values.first as Map<String, dynamic>;
        final content = firstFile['content'] as String;
        return content.trim();
      } else {
        throw Exception(
          'Failed to fetch from GitHub Gist: ${response.statusCode}',
        );
      }
    } catch (e) {
      print('❌ [IMPORT] GitHub Gist fetch error: $e');
      return '';
    }
  }

  /// Fetch data from termbin.com
  Future<String> _fetchFromTermbin(String pasteId) async {
    try {
      final url = 'https://termbin.com/$pasteId';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return response.body.trim();
      } else {
        throw Exception('Failed to fetch from termbin: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [IMPORT] termbin fetch error: $e');
      return '';
    }
  }

  /// Fetch data from paste.rs
  Future<String> _fetchFromPasteRs(String pasteId) async {
    try {
      final url = 'https://paste.rs/$pasteId';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return response.body.trim();
      } else {
        throw Exception(
          'Failed to fetch from paste.rs: ${response.statusCode}',
        );
      }
    } catch (e) {
      print('❌ [IMPORT] paste.rs fetch error: $e');
      return '';
    }
  }

  /// Fetch data from 0x0.st
  Future<String> _fetchFrom0x0st(String pasteId) async {
    try {
      final url = 'https://0x0.st/$pasteId';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return response.body.trim();
      } else {
        throw Exception('Failed to fetch from 0x0.st: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [IMPORT] 0x0.st fetch error: $e');
      return '';
    }
  }

  /// Fetch data from pastes.io (modern, CORS-enabled)
  Future<String> _fetchFromPastesIo(String pasteId) async {
    try {
      final url = 'https://pastes.io/api/pastes/$pasteId';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['sections'] != null && data['sections'].isNotEmpty) {
          // Get the content from the first section
          final sectionContent = data['sections'][0]['contents'];
          return sectionContent.toString().trim();
        } else {
          throw Exception('Invalid pastes.io response structure');
        }
      } else {
        throw Exception(
          'Failed to fetch from pastes.io: ${response.statusCode}',
        );
      }
    } catch (e) {
      print('❌ [IMPORT] pastes.io fetch error: $e');
      return '';
    }
  }

  /// Fetch data from paste.gg
  Future<String> _fetchFromPasteGg(String pasteId) async {
    try {
      final url = 'https://api.paste.gg/v1/pastes/$pasteId';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success' &&
            data['result'] != null &&
            data['result']['files'] != null &&
            data['result']['files'].isNotEmpty) {
          // Get the content from the first file
          final fileContent = data['result']['files'][0]['content']['value'];
          return fileContent.toString().trim();
        } else {
          throw Exception('Invalid paste.gg response structure');
        }
      } else {
        throw Exception(
          'Failed to fetch from paste.gg: ${response.statusCode}',
        );
      }
    } catch (e) {
      print('❌ [IMPORT] paste.gg fetch error: $e');
      return '';
    }
  }

  /// Fetch data from ix.io
  Future<String> _fetchFromIxIo(String pasteId) async {
    try {
      final url = 'http://ix.io/$pasteId';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return response.body.trim();
      } else {
        throw Exception('Failed to fetch from ix.io: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [IMPORT] ix.io fetch error: $e');
      return '';
    }
  }

  /// Fetch data from rentry.co
  Future<String> _fetchFromRentry(String pasteId) async {
    try {
      final url = 'https://rentry.co/$pasteId/raw';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return response.body.trim();
      } else {
        throw Exception('Failed to fetch from rentry: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [IMPORT] rentry fetch error: $e');
      return '';
    }
  }

  /// Fetch data from Hastebin
  Future<String> _fetchFromHastebin(String pasteKey) async {
    try {
      final url = 'https://hastebin.com/raw/$pasteKey';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return response.body.trim();
      } else {
        throw Exception(
          'Failed to fetch from Hastebin: ${response.statusCode}',
        );
      }
    } catch (e) {
      print('❌ [IMPORT] Hastebin fetch error: $e');
      return '';
    }
  }

  /// Fetch data from jsonbin.io
  Future<String> _fetchFromJsonbin(String binId) async {
    try {
      final url = 'https://api.jsonbin.io/v3/b/$binId/latest';
      print('📥 [IMPORT] Fetching from: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['record']['data'];
      } else {
        throw Exception('Failed to fetch from jsonbin: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [IMPORT] jsonbin fetch error: $e');
      return '';
    }
  }

  /// Create furniture and objects in the 3D world from imported data
  /// This ensures imported objects behave identically to native objects
  Future<bool> _createImportedFurniture(
    Map<String, dynamic> furnitureData,
  ) async {
    try {
      print('🪑 [IMPORT] Creating furniture in 3D world...');

      final furniture = furnitureData['furniture'];
      final objects = furnitureData['objects'] as List;

      // Generate unique furniture name to avoid conflicts
      String furnitureName = furniture['name'] as String;
      int suffix = 1;
      final existingNames = await _getExistingFurnitureNames();
      while (existingNames.contains(furnitureName)) {
        furnitureName = '${furniture['name']} ($suffix)';
        suffix++;
      }

      print('🪑 [IMPORT] Creating furniture: $furnitureName');

      // Create furniture using JavaScript (same as native furniture creation)
      final createResult = await webViewController.runJavaScriptReturningResult(
        '''
        (async function() {
          try {
            console.log('🪑 [IMPORT JS] Creating furniture...');
            
            // Get user's current camera position for furniture placement
            let position = { x: 0, y: 0, z: 0 };
            if (window.app && window.app.camera) {
              const direction = new window.THREE.Vector3();
              window.app.camera.getWorldDirection(direction);
              direction.y = 0; // Keep on ground level
              direction.normalize();
              direction.multiplyScalar(5); // Place 5 units in front of user
              
              position.x = window.app.camera.position.x + direction.x;
              position.z = window.app.camera.position.z + direction.z;
            }
            
            // Create furniture with imported configuration
            const config = {
              type: ${jsonEncode(furniture['type'])},
              name: ${jsonEncode(furnitureName)},
              style: ${jsonEncode(furniture['style'] ?? 'modern')},
              position: position,
              rotation: ${jsonEncode(furniture['rotation'] ?? 0)},
              capacity: ${jsonEncode(furniture['capacity'] ?? 20)},
              autoSort: ${jsonEncode(furniture['autoSort'] ?? true)},
              sortCriteria: ${jsonEncode(furniture['sortCriteria'] ?? 'fileName')},
              sortDirection: ${jsonEncode(furniture['sortDirection'] ?? 'ascending')}
            };
            
            console.log('🪑 [IMPORT JS] Furniture config:', config);
            
            const newFurniture = await window.app.furnitureManager.createFurniture(config);
            
            if (!newFurniture) {
              throw new Error('Failed to create furniture');
            }
            
            console.log('✅ [IMPORT JS] Furniture created:', newFurniture.id);
            
            return JSON.stringify({
              success: true,
              furnitureId: newFurniture.id,
              furnitureName: newFurniture.name
            });
          } catch (error) {
            console.error('❌ [IMPORT JS] Create furniture error:', error);
            return JSON.stringify({ success: false, error: error.message });
          }
        })();
      ''',
      );

      final createResultMap = jsonDecode(createResult.toString());
      if (createResultMap['success'] != true) {
        print(
          '❌ [IMPORT] Failed to create furniture: ${createResultMap['error']}',
        );
        return false;
      }

      final furnitureId = createResultMap['furnitureId'];
      print('✅ [IMPORT] Furniture created with ID: $furnitureId');

      // Wait a moment for furniture to be fully initialized
      await Future.delayed(const Duration(milliseconds: 300));

      // Create all objects and place them on the furniture
      print('📦 [IMPORT] Creating ${objects.length} objects...');
      int successCount = 0;

      for (final obj in objects) {
        try {
          // Skip local media placeholders
          if (obj['isLocalMedia'] == true) {
            print(
              '⏭️  [IMPORT] Skipping local media placeholder: ${obj['name']}',
            );
            continue;
          }

          final url = obj['url'] as String?;
          if (url == null || url.isEmpty) {
            print('⚠️  [IMPORT] Skipping object with no URL');
            continue;
          }

          final slotIndex = obj['slotIndex'] as int?;
          final name = obj['name'] as String? ?? 'Imported Object';

          print('📦 [IMPORT] Creating object: $name (slot: $slotIndex)');

          // Create object using the same method as native objects
          final objectCreateResult = await webViewController.runJavaScript('''
            (async function() {
              try {
                const url = ${jsonEncode(url)};
                const slotIndex = ${jsonEncode(slotIndex)};
                const furnitureId = ${jsonEncode(furnitureId)};
                
                console.log('📦 [IMPORT JS] Creating object:', url);
                
                // Create link object using urlManager (same as native YouTube/Vimeo objects)
                const newObject = await window.app.urlManager.createLinkFromURL(url);
                
                if (!newObject) {
                  console.error('❌ [IMPORT JS] Failed to create object from URL:', url);
                  return;
                }
                
                console.log('✅ [IMPORT JS] Object created:', newObject.userData.id);
                
                // Wait for furniture manager to be ready
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Add object to furniture at specific slot
                if (slotIndex !== null && slotIndex !== undefined) {
                  console.log('🪑 [IMPORT JS] Adding object to furniture slot:', slotIndex);
                  await window.app.furnitureManager.addObjectToFurniture(
                    newObject.userData.id,
                    furnitureId,
                    slotIndex
                  );
                  console.log('✅ [IMPORT JS] Object added to furniture');
                }
              } catch (error) {
                console.error('❌ [IMPORT JS] Object creation error:', error);
              }
            })();
          ''');

          successCount++;

          // Small delay between objects to avoid overwhelming the system
          await Future.delayed(const Duration(milliseconds: 100));
        } catch (e) {
          print('❌ [IMPORT] Error creating object: $e');
        }
      }

      print('✅ [IMPORT] Created $successCount/${objects.length} objects');

      return successCount > 0 || objects.isEmpty;
    } catch (e) {
      print('❌ [IMPORT] Error in _createImportedFurniture: $e');
      return false;
    }
  }

  /// Get list of existing furniture names to avoid duplicates
  Future<List<String>> _getExistingFurnitureNames() async {
    try {
      final result = await webViewController.runJavaScriptReturningResult('''
        (function() {
          if (window.app && window.app.furnitureManager) {
            const all = window.app.furnitureManager.getAllFurniture();
            return JSON.stringify(all.map(f => f.name));
          }
          return JSON.stringify([]);
        })();
      ''');

      final names = jsonDecode(result.toString()) as List;
      return names.map((name) => name.toString()).toList();
    } catch (e) {
      print('⚠️  [IMPORT] Error getting furniture names: $e');
      return [];
    }
  }

  /// Show import dialog for manual paste code entry
  static Future<void> showImportDialog(
    BuildContext context,
    FurnitureImportService importService,
  ) async {
    final TextEditingController controller = TextEditingController();
    bool isImporting = false;

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.download, color: Colors.blue),
              SizedBox(width: 8),
              Text('Import Furniture'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Paste the import code from a shared furniture link:'),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  hintText: 'Paste code here',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.paste),
                ),
                maxLines: 3,
                enabled: !isImporting,
              ),
              const SizedBox(height: 8),
              const Text(
                'The code starts with the paste service ID (e.g., ABCD1234)',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              if (isImporting)
                const Padding(
                  padding: EdgeInsets.only(top: 16),
                  child: Center(child: CircularProgressIndicator()),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isImporting ? null : () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.download),
              label: const Text('Import'),
              onPressed: isImporting
                  ? null
                  : () async {
                      final code = controller.text.trim();
                      if (code.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please enter an import code'),
                            backgroundColor: Colors.orange,
                          ),
                        );
                        return;
                      }

                      setState(() => isImporting = true);

                      // Try to import with paste.rs as default (now optimized for small data)
                      final success = await importService.importFromPasteId(
                        code,
                        'pasters',
                      );

                      if (context.mounted) {
                        setState(() => isImporting = false);
                        Navigator.pop(context);

                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              success
                                  ? '✓ Furniture imported successfully!'
                                  : '✗ Import failed. Please check the code.',
                            ),
                            backgroundColor: success
                                ? Colors.green
                                : Colors.red,
                          ),
                        );
                      }
                    },
            ),
          ],
        ),
      ),
    );
  }
}
