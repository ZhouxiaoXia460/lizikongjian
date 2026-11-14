// 栗子空间 - 工具箱修订：删期末目标分；绩点改三栏分行填+规则表；字数统计加标点/页数
// 前置：index.html 已含上一版（绩点/期末目标/字数统计）。幂等保护：无 openToolFinal 时报错退出。
const fs = require('fs');
const path = require('path');
const CRLF = '\r\n';

function crlf(s) { return s.replace(/\r?\n/g, CRLF); }
function frag(name) { return crlf(fs.readFileSync(path.join(__dirname, name), 'utf8')).replace(/\r\n+$/, ''); }

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceOnce(label, search, replace) {
    const i = html.indexOf(search);
    if (i < 0) { console.error('❌ 未找到锚点：' + label); process.exit(1); }
    if (html.indexOf(search, i + 1) >= 0) { console.error('❌ 锚点不唯一：' + label); process.exit(1); }
    html = html.slice(0, i) + replace + html.slice(i + search.length);
    changed++;
    console.log('[OK] ' + label);
}

function cutInsert(label, startMark, endMark, insert) {
    const s = html.indexOf(startMark);
    if (s < 0) { console.error('❌ 未找到起始锚点：' + label); process.exit(1); }
    const e = html.indexOf(endMark, s + startMark.length);
    if (e < 0) { console.error('❌ 未找到结束锚点：' + label); process.exit(1); }
    html = html.slice(0, s) + insert + html.slice(e);
    changed++;
    console.log('[OK] ' + label);
}

if (html.indexOf('openToolFinal') < 0) {
    console.error('❌ index.html 里没有 openToolFinal，与预期版本不符，已中止。');
    process.exit(1);
}

// —— 1) 首页副标题：去掉「期末」 ——
replaceOnce('首页副标题',
    '辈分 · 抽签 · AA · 大写 · BMI · 绩点 · 期末 · 字数',
    '辈分 · 抽签 · AA · 大写 · BMI · 绩点 · 字数');

// —— 2) 宫格：删期末目标分按钮 ——
cutInsert('宫格-删期末按钮',
    '                <button onclick="openToolFinal()"',
    '                <button onclick="openToolWc()"',
    '');

// —— 3) 宫格：绩点描述更新 ——
replaceOnce('宫格-绩点描述',
    '四分制+五分制 · 一起算',
    '四分制+五分制 · 逐门填写');

// —— 4) 页面：替换绩点页 ——
cutInsert('页面-替换绩点页',
    '    <!-- 绩点计算器 -->',
    '    <!-- 期末目标分 -->',
    frag('_frag_gpa_page.html') + CRLF + CRLF);

// —— 5) 页面：删期末目标分页 ——
cutInsert('页面-删期末页',
    '    <!-- 期末目标分 -->',
    '    <!-- 字数统计 -->',
    '');

// —— 6) 字数页：输入框加大（rows 8→10）——
replaceOnce('字数-输入框加大',
    'rows="8" oninput="calcWc()"',
    'rows="10" oninput="calcWc()"');

// —— 7) 字数页：结果卡里加 页数估算 + 每页字数选择 ——
replaceOnce('字数-结果卡插入', [
    '                    <p id="wcChars" class="text-[11px] text-[#B08968] mt-1"></p>',
    '                    <button id="wcCopyBtn"'
].join(CRLF), [
    '                    <p id="wcChars" class="text-[11px] text-[#B08968] mt-1"></p>',
    '                    <p id="wcPages" class="text-[11px] text-[#D9A56E] mt-1"></p>',
    '                    <div class="flex items-center justify-center gap-1.5 mt-2">',
    '                        <span class="text-[10px] text-[#C9B28F]">页数按每页</span>',
    '                        <select id="wcPageBasis" onchange="calcWc()" class="text-[10px] px-2 py-1 rounded-lg border border-[#F5DEC2] bg-[#FFFBF5] text-[#85532E] focus:outline-none">',
    '                            <option value="500">500 字（稿纸）</option>',
    '                            <option value="700" selected>700 字（论文·常用）</option>',
    '                            <option value="800">800 字（较松）</option>',
    '                            <option value="1000">1000 字（紧凑）</option>',
    '                        </select>',
    '                        <span class="text-[10px] text-[#C9B28F]">估算</span>',
    '                    </div>',
    '                    <button id="wcCopyBtn"'
].join(CRLF));

// —— 8) 字数页脚注 ——
replaceOnce('字数-脚注',
    '「字数」按 Word 口径：汉字 + 英文单词 + 数字 · 内容不离开手机',
    '「字数」按 Word 口径：汉字 + 英文单词 + 数字 · 不设字数上限 · 内容不离开手机');

// —— 9) JS：替换绩点段 ——
cutInsert('JS-替换绩点段',
    '    // ============ ⑥ 绩点计算器 ============',
    '    // ============ ⑦ 期末目标分 ============',
    frag('_frag_gpa_js.js') + CRLF);

// —— 10) JS：删期末目标分段 ——
cutInsert('JS-删期末段',
    '    // ============ ⑦ 期末目标分 ============',
    '    // ============ ⑧ 字数统计 ============',
    '');

// —— 11) JS：段号 ⑧→⑦ ——
replaceOnce('JS-段号更正',
    '    // ============ ⑧ 字数统计 ============',
    '    // ============ ⑦ 字数统计 ============');

// —— 12) JS：_wcStats 增加标点统计 ——
replaceOnce('JS-_wcStats', [
    '    function _wcStats(s) {',
    "        s = String(s || '');",
    "        const han = (s.match(/[\\u4e00-\\u9fff]/g) || []).length;",
    "        const en = (s.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;",
    "        const num = (s.match(/\\d+(?:\\.\\d+)?/g) || []).length;",
    "        return { han: han, en: en, num: num, words: han + en + num, withWs: s.length, noWs: s.replace(/\\s/g, '').length };",
    '    }'
].join(CRLF), [
    '    function _wcStats(s) {',
    "        s = String(s || '');",
    "        const han = (s.match(/[\\u4e00-\\u9fff]/g) || []).length;",
    "        const en = (s.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;",
    "        const num = (s.match(/\\d+(?:\\.\\d+)?/g) || []).length;",
    "        const punct = (s.match(/[^0-9A-Za-z\\s\\u4e00-\\u9fff]/g) || []).length;",
    "        return { han: han, en: en, num: num, punct: punct, words: han + en + num, withWs: s.length, noWs: s.replace(/\\s/g, '').length };",
    '    }'
].join(CRLF));

// —— 13) JS：calcWc 输出加标点 ——
replaceOnce('JS-calcWc标点',
    " + ' · 数字 ' + st.num.toLocaleString('zh-CN');",
    " + ' · 数字 ' + st.num.toLocaleString('zh-CN') + ' · 标点符号 ' + st.punct.toLocaleString('zh-CN');");

// —— 14) JS：calcWc 输出加页数估算 ——
replaceOnce('JS-calcWc页数', [
    "        document.getElementById('wcChars').textContent = '总字符 ' + st.withWs.toLocaleString('zh-CN') + '（计空格）/ ' + st.noWs.toLocaleString('zh-CN') + '（不计空格）';",
    "        document.getElementById('wcCopyBtn').classList.remove('hidden');"
].join(CRLF), [
    "        document.getElementById('wcChars').textContent = '总字符 ' + st.withWs.toLocaleString('zh-CN') + '（计空格）/ ' + st.noWs.toLocaleString('zh-CN') + '（不计空格）';",
    "        const basis = parseFloat(document.getElementById('wcPageBasis').value) || 700;",
    "        const pages = st.words / basis;",
    "        const pagesTxt = pages >= 100 ? String(Math.round(pages)) : pages.toFixed(1);",
    "        document.getElementById('wcPages').textContent = '约 ' + pagesTxt + ' 页 · 按每页 ' + basis + ' 字估算';",
    "        document.getElementById('wcCopyBtn').classList.remove('hidden');"
].join(CRLF));

// —— 15) JS：复制结果带上页数 ——
replaceOnce('JS-wcCopy页数',
    " + ' · ' + (document.getElementById('wcRows').textContent || '').trim());",
    " + ' · ' + (document.getElementById('wcPages').textContent || '').trim() + ' · ' + (document.getElementById('wcRows').textContent || '').trim());");

fs.writeFileSync(file, html, 'utf8');
console.log('✅ 已完成 ' + changed + ' 处修订，index.html 已更新。');
