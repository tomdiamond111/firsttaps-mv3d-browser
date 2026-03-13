/**
 * Flutter Bridge for Contacts - webview_flutter compatibility
 * 
 * This script creates a Flutter bridge emulator that works with webview_flutter
 * instead of flutter_inappwebview, specifically for contact loading functionality.
 */

console.log('🔗 Loading Flutter bridge for contacts...');

// Create the flutter bridge emulator
if (!window.flutter_inappwebview) {
    window.flutter_inappwebview = {
        callHandler: function(methodName, params = {}) {
            console.log(`🔗 Flutter bridge call: ${methodName}`, params);
            
            return new Promise((resolve, reject) => {
                switch (methodName) {
                    case 'getDeviceContacts':
                        window.contactsLoadCallback = resolve;
                        // Call Flutter via ContactsChannel
                        if (window.ContactsChannel) {
                            window.ContactsChannel.postMessage(JSON.stringify({
                                action: 'getDeviceContacts'
                            }));
                        } else {
                            console.error('❌ ContactsChannel not available');
                            reject('ContactsChannel not available');
                        }
                        break;
                        
                    case 'getContactFiles':
                        window.contactFilesCallback = resolve;
                        // Call Flutter via ContactsChannel
                        if (window.ContactsChannel) {
                            window.ContactsChannel.postMessage(JSON.stringify({
                                action: 'getContactFiles'
                            }));
                        } else {
                            console.error('❌ ContactsChannel not available');
                            reject('ContactsChannel not available');
                        }
                        break;
                        
                    case 'checkContactPermissions':
                        window.contactPermissionsCallback = resolve;
                        // Call Flutter via ContactsChannel
                        if (window.ContactsChannel) {
                            window.ContactsChannel.postMessage(JSON.stringify({
                                action: 'checkContactPermissions'
                            }));
                        } else {
                            console.error('❌ ContactsChannel not available');
                            reject('ContactsChannel not available');
                        }
                        break;
                        
                    case 'requestContactPermissions':
                        window.contactPermissionsCallback = resolve;
                        // Call Flutter via ContactsChannel
                        if (window.ContactsChannel) {
                            window.ContactsChannel.postMessage(JSON.stringify({
                                action: 'requestContactPermissions'
                            }));
                        } else {
                            console.error('❌ ContactsChannel not available');
                            reject('ContactsChannel not available');
                        }
                        break;
                        
                    case 'ping':
                        // Simple ping test
                        resolve({ status: 'pong', timestamp: Date.now() });
                        break;
                        
                    default:
                        console.warn(`🔗 Unknown Flutter method: ${methodName}`);
                        reject(`Unknown method: ${methodName}`);
                }
            });
        }
    };
    
    console.log('✅ Flutter bridge emulator created for webview_flutter');
} else {
    console.log('✅ flutter_inappwebview already exists');
}

// Add timeout handling for callbacks
const CALLBACK_TIMEOUT = 10000; // 10 seconds

// Helper function to set up callback with timeout
function setupCallbackWithTimeout(callbackName, timeoutMs = CALLBACK_TIMEOUT) {
    const originalCallback = window[callbackName];
    
    const timeoutId = setTimeout(() => {
        if (window[callbackName] === originalCallback) {
            console.warn(`⏰ Callback timeout for ${callbackName}`);
            if (typeof originalCallback === 'function') {
                originalCallback(null, 'Timeout');
            }
            window[callbackName] = null;
        }
    }, timeoutMs);
    
    // Wrap the original callback to clear timeout
    if (typeof originalCallback === 'function') {
        window[callbackName] = function(...args) {
            clearTimeout(timeoutId);
            window[callbackName] = null;
            return originalCallback(...args);
        };
    }
}

// Enhanced contact loading with timeout protection
window.loadDeviceContactsWithTimeout = function(timeoutMs = CALLBACK_TIMEOUT) {
    console.log('📱 Loading device contacts with timeout protection...');
    
    return new Promise((resolve, reject) => {
        // Set up the callback
        window.contactsLoadCallback = function(contacts, error) {
            if (error) {
                reject(error);
            } else {
                resolve(contacts);
            }
        };
        
        // Set up timeout
        setupCallbackWithTimeout('contactsLoadCallback', timeoutMs);
        
        // Make the call
        window.flutter_inappwebview.callHandler('getDeviceContacts')
            .catch(reject);
    });
};

// Enhanced contact files loading
window.loadContactFilesWithTimeout = function(timeoutMs = CALLBACK_TIMEOUT) {
    console.log('📱 Loading contact files with timeout protection...');
    
    return new Promise((resolve, reject) => {
        // Set up the callback
        window.contactFilesCallback = function(contactFiles, error) {
            if (error) {
                reject(error);
            } else {
                resolve(contactFiles);
            }
        };
        
        // Set up timeout
        setupCallbackWithTimeout('contactFilesCallback', timeoutMs);
        
        // Make the call
        window.flutter_inappwebview.callHandler('getContactFiles')
            .catch(reject);
    });
};

// Enhanced permission checking
window.checkContactPermissionsWithTimeout = function(timeoutMs = CALLBACK_TIMEOUT) {
    console.log('📱 Checking contact permissions with timeout protection...');
    
    return new Promise((resolve, reject) => {
        // Set up the callback
        window.contactPermissionsCallback = function(hasPermission, error) {
            if (error) {
                reject(error);
            } else {
                resolve(hasPermission);
            }
        };
        
        // Set up timeout
        setupCallbackWithTimeout('contactPermissionsCallback', timeoutMs);
        
        // Make the call
        window.flutter_inappwebview.callHandler('checkContactPermissions')
            .catch(reject);
    });
};

console.log('✅ Flutter bridge for contacts loaded successfully');
console.log('🔧 Available functions:');
console.log('  - window.flutter_inappwebview.callHandler(method, params)');
console.log('  - window.loadDeviceContactsWithTimeout()');
console.log('  - window.loadContactFilesWithTimeout()');
console.log('  - window.checkContactPermissionsWithTimeout()');
console.log('');
console.log('💡 The bridge now supports contact loading from Flutter!');
