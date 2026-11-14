const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split(/\r?\n/);
function show(a, b) { for (let i = a - 1; i < b; i++) console.log(i + 1, lines[i]); }
console.log('--- addActivity 5146-5160 ---');
show(5146, 5160);
console.log('--- getAvatarEmoji 2891-2905 ---');
show(2891, 2905);
console.log('--- playPokeAnimation 5639-5655 ---');
show(5639, 5655);
console.log('--- _actDayKey 5189-5195 ---');
show(5189, 5196);
console.log('--- mbSave activity line 13360-13368 ---');
show(13360, 13368);
