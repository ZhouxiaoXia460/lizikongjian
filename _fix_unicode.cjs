const fs = require('fs');
let h = fs.readFileSync('index.html', 'utf8');
const B = String.fromCharCode(92);
// 文件里是 /[^\\u4e00-\\u9fa5]/g（两个反斜杠），要改成 /[^\\u4e00-\\u9fa5]/g（一个反斜杠=unicode转义）
const variants = [
    { from: '[^' + B + B + 'u4e00-' + B + B + 'u9fa5]', to: '[^' + B + 'u4e00-' + B + 'u9fa5]' },
    { from: '[^' + B + 'u4e00-' + B + 'u9fa5]', to: '[^\\u4e00-\\u9fa5]' } // 若本身已是单反斜杠则不动
];
let done = false;
for (const v of variants) {
    if (h.includes(v.from)) { h = h.split(v.from).join(v.to); done = true; break; }
}
if (!done) console.log('not found');
else { fs.writeFileSync('index.html', h, 'utf8'); console.log('fixed'); }
