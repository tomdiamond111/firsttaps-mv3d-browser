// Script to update index2.html bundle timestamp
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../index2.html');
const bundlePath = path.join(__dirname, 'bundle_modular_production.js');

// Get bundle file modified time
const stats = fs.statSync(bundlePath);
const mtime = stats.mtime;

// Format timestamp as yyyymmddHHMMSS
function pad(n) { return n < 10 ? '0' + n : n; }
const ts = `${mtime.getFullYear()}${pad(mtime.getMonth()+1)}${pad(mtime.getDate())}${pad(mtime.getHours())}${pad(mtime.getMinutes())}${pad(mtime.getSeconds())}`;

// Read index2.html
let html = fs.readFileSync(indexPath, 'utf8');

// Replace bundle_modular_production.js?v=...
html = html.replace(/bundle_modular_production\.js\?v=\d+/g, `bundle_modular_production.js?v=${ts}`);

// Write back
fs.writeFileSync(indexPath, html, 'utf8');
console.log('index2.html updated with timestamp:', ts);
