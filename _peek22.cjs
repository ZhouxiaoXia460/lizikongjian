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
scan(/function addActivity/, 'addActivity def', 3);
scan(/function playPokeAnimation/, 'playPokeAnimation def', 3);
scan(/partnerEmoji\s*=/, 'partnerEmoji calc', 5);
scan(/function _actDayKey|function getAvatarEmoji|function getPartnerUser/, 'helpers', 6);
