'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"assets/AssetManifest.bin": "9f590a23541e5c6522abb17297bb7c3d",
"assets/AssetManifest.bin.json": "eb3241aa6a471668240f3ab5ed9d2f0a",
"assets/AssetManifest.json": "3ca19a6ce3849622094202a432c831d7",
"assets/assets/images/FirstTapsMV3D_logo1.jpg": "6b456e7234d8ad89541624dfaba77e81",
"assets/assets/images/FirstTapsMV3D_logo1icon.png": "c8a3e03bb0db6a4b446b50a1d2a33042",
"assets/assets/images/FirstTapsMV3D_splash1.gif": "24ba1df13eb7d2b149176bf6fa5703b7",
"assets/assets/images/firsttaps_homescreen_landscape1.png": "1d878783dd211f6d61c12b89f4a7383e",
"assets/assets/images/firsttaps_homescreen_portrait1.png": "ccaf2e9f77e58c3a046fb7e9187d98bc",
"assets/assets/web/bundle_test.html": "dd219546b8b2cea908ec13a4fd0d9905",
"assets/assets/web/entity_level_showcase.html": "d298e7b6b26a41dba7d56fd3de0f2677",
"assets/assets/web/index2.html": "1c1594685fbb762cc35f46f26da30616",
"assets/assets/web/js/appSyncBridge.js": "4abf98e59c9bc635d3dd745cedab0944",
"assets/assets/web/js/avatar_persistence_bridge.js": "bc6953bca16c2046d51ce649eaf94769",
"assets/assets/web/js/billboardManager.js": "106ccf0a0272596dc7391d3d05905af0",
"assets/assets/web/js/browserBridge.js": "ebd8ab5cc48c851229530a0c5f49ea0b",
"assets/assets/web/js/build_modular_fixed.ps1": "942606fd9e72a496257191aa896bc46d",
"assets/assets/web/js/bundle_core_production.js": "960c57ce16de944a6f081ed51aaf3e13",
"assets/assets/web/js/bundle_premium_production.js": "2b74ae6e467f818a2b45617528dd9a49",
"assets/assets/web/js/contactDialerBridge.js": "cae0031ec4f21a8da66ee13d4e992443",
"assets/assets/web/js/contact_diagnostic.js": "20bfae4f5da386015c566f52b1432238",
"assets/assets/web/js/demoContentConfig.js": "2dad948dfefa48b6fd2a1f05346b9343",
"assets/assets/web/js/entity_showcase.js": "344cae1fcdd9dfa4ec4e58bc2a3177b6",
"assets/assets/web/js/find_syntax_error.ps1": "d56f95762137f547a4f15e2b0e1c62ca",
"assets/assets/web/js/flutter_bridge_contacts.js": "49f71194fc93fe63b1c82ffa79b73f4b",
"assets/assets/web/js/furniture_animation_tests.js": "ad51ce9daf2a4f9df62cd395c99cd5ae",
"assets/assets/web/js/htmlDemoCustomizationUI.js": "e98e397d7b527112c526c1e50fdef801",
"assets/assets/web/js/htmlDemoSvgEngine.js": "612e7f95a8fdf5dadba2bcd13aeef8cf",
"assets/assets/web/js/linkNameHandler.js": "d0f45b304791a41c00cf8402ca6853d3",
"assets/assets/web/js/linkNamePersistence.js": "06cb14d2be46225bc98762ff0c3ea8be",
"assets/assets/web/js/objectCreators.js": "97c249c7d3fcef50667747adc0af1a7b",
"assets/assets/web/js/objectInteraction.js": "573919355b0f1df750a419430d6a5073",
"assets/assets/web/js/posterURLPersistenceChannel.js": "7735e41f48f36acfad854d4e6ef52c8f",
"assets/assets/web/js/premium_gaming_bridge.js": "91a55128f7040a4ab902fa8ddab0f02e",
"assets/assets/web/js/recommendation_badges.js": "b97d2d9dbc9e9b2ca2e7dad40c65b673",
"assets/assets/web/js/smsBridge.js": "f86c21bdfc2ec9955ff45db49a2dd439",
"assets/assets/web/js/smsTextInputLoader.js": "7b0bc221c436c4a2cd1a0f37684864a0",
"assets/assets/web/js/svgAvatarReplacer.js": "529df7bf4dea4b165246e2c0890eb5d9",
"assets/assets/web/js/test-forest-menu.js": "3a04d72800cf4b5ffa2a7d9d91ba83b4",
"assets/assets/web/js/test_append.txt": "5b92e6a7424a1a92639f8fcc97409337",
"assets/assets/web/js/threejs_world_init.js": "c21279d885670a0c5aff603caffe05fa",
"assets/assets/web/js/threeSetup.js": "a2f0068360ed9e4c08f51674ece0103e",
"assets/assets/web/js/uiController.js": "8594ae063626d09681412604fefd55e2",
"assets/assets/web/js/update_index2_timestamp.js": "ec72083edd2bb89948efb71817c883d0",
"assets/assets/web/test-share-viewer.html": "66fb8c14cf244b6abfbe86ddaabb17b8",
"assets/assets/web/test_level6_level7.html": "04778d238651917f968fe8bfa44bc48f",
"assets/assets/web/themes/default_theme.json": "b58f4fd5cefba1c000bf942c8b7a48b5",
"assets/assets/web/themes/default_theme2.json": "b58f4fd5cefba1c000bf942c8b7a48b5",
"assets/assets/web/themes/jungle_theme.json": "d41d8cd98f00b204e9800998ecf8427e",
"assets/assets/web/themes/jungle_theme2.json": "d41d8cd98f00b204e9800998ecf8427e",
"assets/assets/web/themes/ocean_theme.json": "d41d8cd98f00b204e9800998ecf8427e",
"assets/assets/web/themes/ocean_theme2.json": "d41d8cd98f00b204e9800998ecf8427e",
"assets/assets/web/themes/space_theme.json": "d41d8cd98f00b204e9800998ecf8427e",
"assets/assets/web/themes/space_theme2.json": "d41d8cd98f00b204e9800998ecf8427e",
"assets/assets/web/youtube_player_test.html": "f8645b0822dd02b8686f59b481da12c5",
"assets/FontManifest.json": "dc3d03800ccca4601324923c0b1d6d57",
"assets/fonts/MaterialIcons-Regular.otf": "ae83eb2d32e18cbc0f0a322fb77e4fdd",
"assets/NOTICES": "e9f11a39a93b14ab587ee7566cf8b8d6",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "33b7d9392238c04c131b6ce224e13711",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"canvaskit/canvaskit.js": "728b2d477d9b8c14593d4f9b82b484f3",
"canvaskit/canvaskit.js.symbols": "bdcd3835edf8586b6d6edfce8749fb77",
"canvaskit/canvaskit.wasm": "7a3f4ae7d65fc1de6a6e7ddd3224bc93",
"canvaskit/chromium/canvaskit.js": "8191e843020c832c9cf8852a4b909d4c",
"canvaskit/chromium/canvaskit.js.symbols": "b61b5f4673c9698029fa0a746a9ad581",
"canvaskit/chromium/canvaskit.wasm": "f504de372e31c8031018a9ec0a9ef5f0",
"canvaskit/skwasm.js": "ea559890a088fe28b4ddf70e17e60052",
"canvaskit/skwasm.js.symbols": "e72c79950c8a8483d826a7f0560573a1",
"canvaskit/skwasm.wasm": "39dd80367a4e71582d234948adc521c0",
"debug-storage.html": "0b8b18552b76a144c804c90fac619101",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"flutter.js": "83d881c1dbb6d6bcd6b42e274605b69c",
"flutter_bootstrap.js": "cabedbfe67535f3c02f8e2ba0aa0bb25",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"icons/Icon-maskable-192.png": "c457ef57daa1d16f64b27b786ec2ea3c",
"icons/Icon-maskable-512.png": "301a7604d45b3e739efc881eb04896ea",
"index.html": "8785761599fb977283243df5e5a73f8f",
"/": "8785761599fb977283243df5e5a73f8f",
"main.dart.js": "77e7bb9ebad6d7cd8c1eebc690c919eb",
"manifest.json": "68520eab54e4ccd48524bc8763520a08",
"version.json": "b61bf9b4a9fa5a8bae1818f41d81b14c"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
