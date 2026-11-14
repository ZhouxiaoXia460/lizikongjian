// 3.2/3.3 小屏紧凑补丁
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
rep(`        .iso-lib-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 12px 8px; }
        .iso-lib-title { font-size: 13px; font-weight: 700; color: #FFF6EA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`,
`        .iso-lib-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 56px 8px 12px; }
        .iso-lib-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 700; color: #FFF6EA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`, 'lib-head');
rep(`            #isoItemSelected { max-width: 72px; overflow: hidden; text-overflow: ellipsis; }
        }`,
`            #isoItemSelected { max-width: 72px; overflow: hidden; text-overflow: ellipsis; }
        }
        /* —— 3.2/3.3 小屏紧凑补丁：压缩头部行高，保证抽屉展开时画布顶部仍可视 —— */
        @media (max-width: 639px) {
            .iso-chip-btn { font-size: 11px; padding: 6px 10px; }
            .iso-space-tab { font-size: 12px; padding: 7px 12px; }
            .iso-theme-btn { font-size: 11px; padding: 7px 11px; }
            #isoComboRow .iso-space-tab, #isoComboRow .iso-theme-btn { white-space: nowrap; flex: 0 0 auto; }
            .iso-lib-title em { display: none; }
            #isoLibBody { max-height: 42vh; }
        }`, 'compact');
fs.writeFileSync(FILE, c, 'utf8');
console.log('✓ 紧凑补丁 ' + applied + ' 处完成');
