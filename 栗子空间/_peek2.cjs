const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const i = h.indexOf('<div class="iso-rail-left">');
console.log('index:', i);
if (i >= 0) console.log(JSON.stringify(h.slice(i, i + 780)));
