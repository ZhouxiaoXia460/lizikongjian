// 栗子空间 - 绩点计算器升级：9 种口径一起算（含北大连续公式等压绩点算法）
// 幂等保护：已含 gpav-ten37 时拒绝重复执行。
const fs = require('fs');
const path = require('path');
const CRLF = '\r\n';

function crlf(s) { return s.replace(/\r?\n/g, CRLF); }
function frag(name) { return crlf(fs.readFileSync(path.join(__dirname, name), 'utf8')).replace(/\r\n+$/, ''); }

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function cutInsert(label, startMark, endMark, insert) {
    const s = html.indexOf(startMark);
    if (s < 0) { console.error('❌ 未找到起始锚点：' + label); process.exit(1); }
    const e = html.indexOf(endMark, s + startMark.length);
    if (e < 0) { console.error('❌ 未找到结束锚点：' + label); process.exit(1); }
    html = html.slice(0, s) + insert + html.slice(e);
    changed++;
    console.log('[OK] ' + label);
}

function replaceOnce(label, search, replace) {
    const i = html.indexOf(search);
    if (i < 0) { console.error('❌ 未找到锚点：' + label); process.exit(1); }
    if (html.indexOf(search, i + 1) >= 0) { console.error('❌ 锚点不唯一：' + label); process.exit(1); }
    html = html.slice(0, i) + replace + html.slice(i + search.length);
    changed++;
    console.log('[OK] ' + label);
}

if (html.indexOf('gpav-ten37') >= 0) {
    console.error('❌ index.html 已是新版（含 gpav-ten37），疑似重复执行，已中止。');
    process.exit(1);
}
if (html.indexOf('gpaMain4') < 0) {
    console.error('❌ index.html 里没有旧版标记 gpaMain4，与预期版本不符，已中止。');
    process.exit(1);
}

// 1) 页面：整块替换绩点页（结果区改为 9 格口径）
cutInsert('页面-替换绩点页',
    '    <!-- 绩点计算器 -->',
    '    <!-- 字数统计 -->',
    frag('_frag_gpa_page2.html') + CRLF + CRLF);

// 2) JS：整块替换绩点段（GPA_SCALES 多算法 + 北大公式）
cutInsert('JS-替换绩点段',
    '    // ============ ⑥ 绩点计算器 ============',
    '    // ============ ⑦ 字数统计 ============',
    frag('_frag_gpa_js2.js') + CRLF);

// 3) 宫格描述
replaceOnce('宫格-绩点描述',
    '四分制+五分制 · 逐门填写',
    '七种算法一起算 · 逐门填写');

fs.writeFileSync(file, html, 'utf8');
console.log('✅ 已完成 ' + changed + ' 处修订，index.html 已更新。');
