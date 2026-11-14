const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split(/\r?\n/);
function show(a, b) { for (let i = a - 1; i < b; i++) console.log(i + 1, lines[i]); }
function scan(re, tag, max) {
  console.log('===== ' + tag + ' =====');
  let n = 0;
  lines.forEach((l, i) => {
    if (n >= (max || 10)) return;
    if (re.test(l)) { console.log(String(i + 1).padStart(6), l.trim().slice(0, 150)); n++; }
  });
}
console.log('--- addActivity ---');
show(4996, 5014);
console.log('--- playPokeAnimation ---');
show(5494, 5508);
scan(/getPartnerAvatar|partner.*emoji|navChatIcon.*=/, 'partner emoji helper', 12);
scan(/falling-chestnut \{/, 'falling css', 3);
scan(/更新了「/, 'memo activity text', 5);
