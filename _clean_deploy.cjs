// 栗子空间 - deploy.bat 清理 v3：先归一化行尾为 CRLF，再按行过滤删除废弃部署行
const fs = require('fs');
let s = fs.readFileSync('deploy.bat', 'utf8');

// 0) 归一化行尾（原文件 CRLF/LF 混杂）
s = s.replace(/\r\n/g, '\n').split('\n').join('\r\n');
let ok = true;

function rep(label, a, b) {
    if (!s.includes(a)) { console.error('❌ miss: ' + label); ok = false; return; }
    s = s.replace(a, b);
    console.log('[OK] ' + label);
}

rep('3b 标题',
    'echo [3b] 部署 notice.js / admin.html（公告功能）...',
    'echo [3b] 部署 notice.js / admin.html / admin-icon.png（管理设置页）...');
rep('补 admin-icon 部署',
    'if errorlevel 1 echo ⚠ admin-gateway.js 部署失败（设置页无法读写云端）',
    'if errorlevel 1 echo ⚠ admin-gateway.js 部署失败（设置页无法读写云端）\r\n' +
    'call tcb hosting deploy admin-icon.png admin-icon.png -e kongjian-d9gplvfce4e66ddb4\r\n' +
    'if errorlevel 1 echo ⚠ admin-icon.png 部署失败（iOS 图标缺失）');
rep('3c 标题',
    'echo [3c] 部署题库设置（truth-bank.js / truth-admin.html / 图标）...',
    'echo [3c] 部署云端题库（truth-bank.js）...');
rep('3d 标题',
    'echo [3d] 部署情话设置（quotes-bank.js / quotes-admin.html / 图标）...',
    'echo [3d] 部署云端情话（quotes-bank.js）...');

// 按行过滤：删除所有引用已废弃文件的部署行
const lines = s.split('\r\n');
const kept = [];
let dropped = 0;
const re = /truth-admin\.html|truth-icon\.png|quotes-admin\.html|quotes-icon\.png/;
lines.forEach(function (l) {
    if (re.test(l)) { dropped++; console.log('[DEL] ' + l.slice(0, 70)); return; }
    kept.push(l);
});
s = kept.join('\r\n');
console.log('共删除 ' + dropped + ' 行（预期 8）');
if (dropped !== 8) { console.error('❌ 删除行数不符，中止'); ok = false; }

if (!ok) process.exit(1);
fs.writeFileSync('deploy.bat', s, 'utf8');
console.log('✅ deploy.bat 已清理并统一为 CRLF');
