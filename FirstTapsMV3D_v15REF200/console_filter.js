// Console Filter Script for SMS Debugging
// Paste this into the browser console to filter for relevant SMS logs

// Store original console methods
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

// SMS-related keywords to filter for
const SMS_KEYWORDS = [
    'SMS',
    'sms',
    'message',
    'Message',
    'telephony',
    'Telephony',
    'incoming',
    'received',
    'DARCIE',
    'Darcie',
    'permission',
    'Permission',
    'flutter-sms',
    'smsEventRouter',
    'smsScreen',
    'renderInterface',
    'channel',
    'Channel',
    'bridge',
    'Bridge'
];

// Unwanted debug keywords to exclude
const EXCLUDE_KEYWORDS = [
    'Three.js',
    'WebGL',
    'texture',
    'geometry',
    'material',
    'camera',
    'scene',
    'renderer',
    'mesh',
    'orbit',
    'canvas size',
    'render cycle',
    'animation',
    'frame'
];

// Function to check if a message should be shown
function shouldShowMessage(message) {
    const messageStr = String(message).toLowerCase();
    
    // Exclude unwanted messages first
    if (EXCLUDE_KEYWORDS.some(keyword => messageStr.includes(keyword.toLowerCase()))) {
        return false;
    }
    
    // Include SMS-related messages
    return SMS_KEYWORDS.some(keyword => messageStr.includes(keyword.toLowerCase()));
}

// Function to format timestamp
function getTimestamp() {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
}

// Enhanced console methods with filtering
console.log = function(...args) {
    if (args.some(arg => shouldShowMessage(arg))) {
        originalConsole.log(`${getTimestamp()} [LOG]`, ...args);
    }
};

console.error = function(...args) {
    if (args.some(arg => shouldShowMessage(arg))) {
        originalConsole.error(`${getTimestamp()} [ERROR]`, ...args);
    }
};

console.warn = function(...args) {
    if (args.some(arg => shouldShowMessage(arg))) {
        originalConsole.warn(`${getTimestamp()} [WARN]`, ...args);
    }
};

console.info = function(...args) {
    if (args.some(arg => shouldShowMessage(arg))) {
        originalConsole.info(`${getTimestamp()} [INFO]`, ...args);
    }
};

// Function to restore original console
window.restoreConsole = function() {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    originalConsole.log('✅ Console filtering disabled - all logs restored');
};

// Function to clear console and show status
window.clearAndFilter = function() {
    console.clear();
    originalConsole.log('🔍 SMS Console Filter Active');
    originalConsole.log('📱 Showing only SMS-related logs with timestamps');
    originalConsole.log('⚡ To disable: restoreConsole()');
    originalConsole.log('🧹 To clear: clearAndFilter()');
    originalConsole.log('-------------------------------------------');
};

// Function to show only critical SMS events
window.criticalOnly = function() {
    const CRITICAL_KEYWORDS = [
        'CRITICAL',
        'ERROR',
        'RECEIVED',
        'PERMISSION',
        'FAILED',
        'NOT FOUND',
        'MISSING'
    ];
    
    console.log = function(...args) {
        const messageStr = String(args.join(' ')).toUpperCase();
        if (CRITICAL_KEYWORDS.some(keyword => messageStr.includes(keyword))) {
            originalConsole.log(`${getTimestamp()} [CRITICAL]`, ...args);
        }
    };
    
    console.error = function(...args) {
        originalConsole.error(`${getTimestamp()} [CRITICAL-ERROR]`, ...args);
    };
    
    originalConsole.log('🚨 Critical-only mode enabled - showing only critical SMS events');
};

// Auto-activate filtering
clearAndFilter();
