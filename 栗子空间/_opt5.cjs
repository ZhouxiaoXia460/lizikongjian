// 简化：FAB 不再随抽屉状态隐藏（抽屉打开时自然覆盖其上）
const fs = require('fs');
const FILE = require('path').join(__dirname, 'index.html');
let c = fs.readFileSync(FILE, 'utf8');
let applied = 0;
function rep(oldS, newS, label) {
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reSrc = oldS.split('\n').map(esc).join('\\r?\\n');
    const n = (c.match(new RegExp(reSrc, 'g')) || []).length;
    if (n === 0) throw new Error('未找到锚点：' + label);
    if (n > 1) throw new Error('锚点不唯一（' + n + ' 次）：' + label);
    c = c.replace(new RegExp(reSrc), newS.replace(/\$/g, '$$$$'));
    applied++;
}
rep(`        #isoLibFab { display: flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 0.18s ease; }
        #isoEditView.lib-open #isoLibFab { opacity: 0; pointer-events: none; }`,
`        #isoLibFab { display: flex; align-items: center; justify-content: center; }`, 'fab-css');
rep(`        const lib = document.getElementById('isoLib');
        if (lib) lib.classList.toggle('lib-open', isoLibOpen);
        const editView = document.getElementById('isoEditView');
        if (editView) editView.classList.toggle('lib-open', isoLibOpen); // 联动隐藏家具库 FAB
        const ch = document.getElementById('isoLibChevron');`,
`        const lib = document.getElementById('isoLib');
        if (lib) lib.classList.toggle('lib-open', isoLibOpen);
        const ch = document.getElementById('isoLibChevron');`, 'fab-js');
fs.writeFileSync(FILE, c, 'utf8');
console.log('✓ FAB 简化 ' + applied + ' 处完成');
