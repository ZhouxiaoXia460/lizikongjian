const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const i = h.indexOf('<div id="isoHouseView">');
console.log('index:', i);
if (i >= 0) console.log(JSON.stringify(h.slice(i - 20, i + 1300)));
