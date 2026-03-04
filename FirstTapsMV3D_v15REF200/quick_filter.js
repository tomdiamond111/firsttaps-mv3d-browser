// QUICK SMS CONSOLE FILTER - Paste this into browser console
// This will filter console logs to show only SMS-related messages

(function() {
    const original = {log: console.log, error: console.error, warn: console.warn};
    const keywords = ['sms', 'message', 'telephony', 'darcie', 'permission', 'channel', 'bridge', 'received', 'incoming'];
    const exclude = ['three.js', 'webgl', 'texture', 'geometry', 'render cycle'];
    
    function shouldShow(msg) {
        const str = String(msg).toLowerCase();
        return keywords.some(k => str.includes(k)) && !exclude.some(e => str.includes(e));
    }
    
    function timestamp() {
        const t = new Date();
        return `[${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}]`;
    }
    
    console.log = (...args) => args.some(shouldShow) && original.log(timestamp(), '[LOG]', ...args);
    console.error = (...args) => args.some(shouldShow) && original.error(timestamp(), '[ERROR]', ...args);
    console.warn = (...args) => args.some(shouldShow) && original.warn(timestamp(), '[WARN]', ...args);
    
    window.restoreConsole = () => Object.assign(console, original);
    console.clear();
    original.log('🔍 SMS Filter Active - restoreConsole() to disable');
})();
