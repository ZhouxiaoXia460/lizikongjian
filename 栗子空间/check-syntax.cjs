// 栗子空间 - 部署前语法检查
// 用法：node check-syntax.cjs
// 从 index.html 中提取所有内联 <script> 块，用 vm 逐块做语法检查，任何一块报错即退出码 1（deploy.bat 会取消部署）。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const file = path.join(__dirname, 'kongjian.html'); // 编辑源（deploy.bat 会先 copy 到 index.html 再部署）
let html;
try {
    html = fs.readFileSync(file, 'utf8');
} catch (e) {
    console.error('❌ 读取 index.html 失败：' + e.message);
    process.exit(1);
}

const blocks = [];
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    const code = m[2] || '';
    // 外链脚本（src=...）没有内联代码可查
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (code.trim() === '') continue;
    blocks.push(code);
}

if (blocks.length === 0) {
    console.error('❌ 没有找到可检查的内联 <script> 块，请确认文件完整。');
    process.exit(1);
}

let failed = false;
blocks.forEach((code, i) => {
    try {
        new vm.Script(code, { filename: 'index.html#script-' + (i + 1) });
        console.log('[OK]   块 #' + (i + 1) + '（' + code.length + ' 字符）');
    } catch (e) {
        failed = true;
        const msg = (e && e.stack) ? String(e.stack).split('\n').slice(0, 4).join('\n') : String(e);
        console.error('[FAIL] 块 #' + (i + 1) + '（' + code.length + ' 字符）\n' + msg);
    }
});

if (failed) {
    console.error('❌ 存在语法错误，请修复后再部署。');
    process.exit(1);
}
console.log('语法检查全部通过 ✓');
