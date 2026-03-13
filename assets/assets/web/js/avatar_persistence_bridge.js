/**
 * Avatar Persistence Bridge for Flutter WebView
 * 
 * This bridge maps all the missing JavaScript handlers that the ContactCustomizationManager
 * is trying to call to the new AvatarPersistenceChannel in Flutter.
 */

console.log('👤 Avatar Persistence Bridge - Initializing...');

// Create the bridge if it doesn't exist
if (!window.flutter_inappwebview) {
    window.flutter_inappwebview = {
        callHandler: function(methodName, ...args) {
            console.log(`👤 Flutter bridge call: ${methodName}`, args);
            console.log(`👤 [BRIDGE DEBUG] Args type:`, typeof args, 'Array?', Array.isArray(args), 'Length:', args.length);
            if (args.length > 0) {
                console.log(`👤 [BRIDGE DEBUG] First arg type:`, typeof args[0], 'value preview:', String(args[0]).substring(0, 100));
            }
            return new Promise((resolve, reject) => {
                try {
                    // Map all the JavaScript handlers to AvatarPersistenceChannel
                    switch (methodName) {
                        case 'loadAvatarCustomizations':
                            console.log('👤 [BRIDGE DEBUG] Setting avatarLoadCallback to resolve function');
                            console.log('👤 [BRIDGE DEBUG] Previous callback type:', typeof window.avatarLoadCallback);
                            window.avatarLoadCallback = (data) => {
                                console.log('👤 [BRIDGE DEBUG] ✅ Bridge callback invoked with data:', data);
                                console.log('👤 [BRIDGE DEBUG] Data type:', typeof data);
                                console.log('👤 [BRIDGE DEBUG] Data length:', data?.length);
                                console.log('👤 [BRIDGE DEBUG] Resolving promise...');
                                resolve(data);
                            };
                            // console.log('👤 [BRIDGE DEBUG] New callback type:', typeof window.avatarLoadCallback);
                            // console.log('👤 [BRIDGE DEBUG] Posting message to AvatarPersistenceChannel...');
                            window.AvatarPersistenceChannel.postMessage(JSON.stringify({
                                action: 'loadAvatarCustomizations'
                            }));
                            // console.log('👤 [BRIDGE DEBUG] Message posted, waiting for Flutter response...');
                            break;
                            
                        case 'saveAvatarCustomizations':
                        case 'storeAvatarData':
                            window.avatarSaveCallback = resolve;
                            // CRITICAL FIX: args[0] might be an object, ensure it's properly stringified
                            let dataToSend = args[0] || '';
                            if (typeof dataToSend === 'object') {
                                dataToSend = JSON.stringify(dataToSend);
                            }
                            console.log('👤 [BRIDGE DEBUG] Sending data type:', typeof dataToSend, 'length:', dataToSend.length);
                            console.log('👤 [BRIDGE DEBUG] Data preview:', dataToSend.substring(0, 100));
                            window.AvatarPersistenceChannel.postMessage(JSON.stringify({
                                action: 'saveAvatarCustomizations',
                                data: dataToSend
                            }));
                            break;
                            
                        case 'readFileFromStorage':
                            window.avatarFileLoadCallback = resolve;
                            window.AvatarPersistenceChannel.postMessage(JSON.stringify({
                                action: 'readFileFromStorage',
                                filename: args[0] || 'avatar_customizations.json'
                            }));
                            break;
                            
                        case 'saveToFile':
                        case 'writeFileToStorage':
                            window.avatarFileSaveCallback = resolve;
                            // Handle different argument formats
                            let filename, data;
                            if (typeof args[0] === 'object' && args[0].filename) {
                                filename = args[0].filename;
                                data = args[0].content || args[0].data || '';
                            } else {
                                filename = args[0] || 'avatar_customizations.json';
                                data = args[1] || '';
                            }
                            window.AvatarPersistenceChannel.postMessage(JSON.stringify({
                                action: 'saveToFile',
                                filename: filename,
                                data: data
                            }));
                            break;
                            
                        case 'getStringPreference':
                        case 'loadStringFromPrefs':
                        case 'getUserPreference':
                        case 'SharedPreferencesChannel':
                            // For SharedPreferencesChannel with single argument, treat as read operation
                            if (methodName === 'SharedPreferencesChannel' && args.length === 1) {
                                window.avatarPrefsLoadCallback = resolve;
                                window.AvatarPersistenceChannel.postMessage(JSON.stringify({
                                    action: 'getStringPreference',
                                    key: args[0] || 'avatar_customizations'
                                }));
                            } else {
                                window.avatarPrefsLoadCallback = resolve;
                                window.AvatarPersistenceChannel.postMessage(JSON.stringify({
                                    action: 'getStringPreference',
                                    key: args[0] || 'avatar_customizations'
                                }));
                            }
                            break;
                            
                        case 'saveToPrefs':
                        case 'SharedPreferencesChannel':
                        case 'setStringPreference':
                        case 'saveStringToPrefs':
                        case 'storeUserPreference':
                            window.avatarPrefsSaveCallback = resolve;
                            window.AvatarPersistenceChannel.postMessage(JSON.stringify({
                                action: 'saveToPrefs',
                                key: args[0] || 'avatar_customizations',
                                data: args[1] || ''
                            }));
                            break;
                            
                        // Handle additional missing handlers
                        case 'storageGet':
                        case 'loadData':
                        case 'getData':
                            window.avatarPrefsLoadCallback = resolve;
                            window.AvatarPersistenceChannel.postMessage(JSON.stringify({
                                action: 'getStringPreference',
                                key: args[0] || 'avatar_customizations'
                            }));
                            break;
                            
                        // Handle existing successful channels
                        case 'getDeviceContacts':
                            window.contactsLoadCallback = resolve;
                            if (window.ContactsChannel) {
                                window.ContactsChannel.postMessage(JSON.stringify({
                                    action: 'getDeviceContacts'
                                }));
                            } else {
                                console.error('❌ ContactsChannel not available');
                                reject('ContactsChannel not available');
                            }
                            break;
                            
                        default:
                            console.log(`👤 Unknown handler: ${methodName}`);
                            // Try to resolve with null for unknown handlers
                            resolve(null);
                            break;
                    }
                } catch (error) {
                    console.error(`👤 Error in bridge handler for ${methodName}:`, error);
                    reject(error);
                }
            });
        }
    };
}

// Set up global callbacks that will be called from Flutter
window.avatarLoadCallback = null;
window.avatarSaveCallback = null;
window.avatarFileLoadCallback = null;
window.avatarFileSaveCallback = null;
window.avatarPrefsLoadCallback = null;
window.avatarPrefsSaveCallback = null;

console.log('👤 Avatar Persistence Bridge - Ready!');
