// 栗子空间 - 离线工具箱新增大学生小工具（一键写入 index.html）
// 片段：_frag_tools_grid.html / _frag_tools_pages.html / _frag_tools_js.js
// 幂等保护：检测到已写入（toolGpaPage）则拒绝重复执行。
const fs = require('fs');
const path = require('path');
const CRLF = '\r\n';

function crlf(s) { return s.replace(/\r?\n/g, CRLF); }
function frag(name) {
    return crlf(fs.readFileSync(path.join(__dirname, name), 'utf8')).replace(/\r\n+$/, '');
}

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

if (html.indexOf('toolGpaPage') >= 0) {
    console.error('❌ index.html 里已经有 toolGpaPage，疑似重复写入，已中止。');
    process.exit(1);
}

// 1) 首页入口副标题
replaceOnce('首页副标题',
    '辈分计算 · 吃什么抽签 · AA人均 · 大写金额 · BMI',
    '辈分 · 抽签 · AA · 大写 · BMI · 绩点 · 期末 · 字数');

// 2) 工具宫格：BMI 按钮之后追加 3 个新按钮
replaceOnce('宫格按钮', [
    '                <button onclick="openToolBmi()" class="card p-4 text-left active:scale-[0.97] transition-transform">',
    '                    <div class="text-3xl mb-2">⚖️</div>',
    '                    <div class="font-semibold text-[#5E3A20] text-sm">BMI 计算</div>',
    '                    <div class="text-[10px] text-[#B08968] mt-0.5">健康体重参考 · 离线可用</div>',
    '                </button>'
].join(CRLF), [
    '                <button onclick="openToolBmi()" class="card p-4 text-left active:scale-[0.97] transition-transform">',
    '                    <div class="text-3xl mb-2">⚖️</div>',
    '                    <div class="font-semibold text-[#5E3A20] text-sm">BMI 计算</div>',
    '                    <div class="text-[10px] text-[#B08968] mt-0.5">健康体重参考 · 离线可用</div>',
    '                </button>'
].join(CRLF) + CRLF + frag('_frag_tools_grid.html'));

// 3) 新工具页面：BMI 页结尾之后插入
replaceOnce('工具页面', [
    '            <p class="text-[10px] text-[#C9B28F] text-center mt-4">中国成人标准 · 本地离线计算，无需联网</p>',
    '        </div>',
    '    </div>'
].join(CRLF), [
    '            <p class="text-[10px] text-[#C9B28F] text-center mt-4">中国成人标准 · 本地离线计算，无需联网</p>',
    '        </div>',
    '    </div>'
].join(CRLF) + CRLF + CRLF + frag('_frag_tools_pages.html'));

// 4) 工具 JS：插入到「离线工具箱结束」标记之前
replaceOnce('工具JS',
    '    // ==================== 离线工具箱结束 ====================',
    frag('_frag_tools_js.js') + CRLF + '    // ==================== 离线工具箱结束 ====================');

fs.writeFileSync(file, html, 'utf8');
console.log('✅ 已完成 ' + changed + ' 处修改，index.html 已更新。');
