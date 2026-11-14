// 栗子空间 - 应用端修订：
// 1) 真心话严格不重复（答题记录 truthAnswered + 往期记录，答完给出明确提示 + 可清空记录重抽）
// 2) 情话轮放起点：云端 startIndex 变化时把轮换指针跳到第 N 句
const fs = require('fs');
const path = require('path');
const CRLF = '\r\n';

function crlf(s) { return s.replace(/\r?\n/g, CRLF); }
function joinNL(lines, sep) { return lines.join(sep); }

// —— index.html ——
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

if (html.indexOf('_truthUsedSets') >= 0 || html.indexOf('LOVE_QUOTE_START_KEY') >= 0) {
    console.error('❌ 疑似重复执行（已含新代码），中止。');
    process.exit(1);
}

// —— 1a) 重写 _truthPickQuestion：严格不重复 + 全部随机按「未答题量」加权 ——
cutInsert('真心话-重写抽题', [
    '        function _truthPickQuestion() {'
].join(CRLF), [
    '        function truthDraw() {'
].join(CRLF), joinNL([
    '        function _truthUsedSets() {',
    '            // 已答过的题 = 往期记录 + 答题记录 truthAnswered（与往期记录独立：删记录不会让题自动复活，可用「清空答题记录」重置）',
    '            const usedQids = new Set(_truthArr().map(function (r) { return r.srcQid || \'\'; }));',
    '            if (!Array.isArray(appData.truthAnswered)) appData.truthAnswered = [];',
    '            appData.truthAnswered.forEach(function (id) { if (id) usedQids.add(id); });',
    '            const usedQs = new Set(_truthArr().filter(function (r) { return r.src === \'official\'; }).map(function (r) { return r.q; }));',
    '            appData.truthAnswered.forEach(function (id) { if (id && id.indexOf(\'off:\') === 0) usedQs.add(id.slice(4)); });',
    '            return { usedQids: usedQids, usedQs: usedQs };',
    '        }',
    '',
    '        function _truthPickQuestion() {',
    '            const used = _truthUsedSets();',
    '            if (truthState.source === \'custom\' || truthState.source === \'partner\') {',
    '                const me = appData.currentUserId;',
    '                let pool = _truthCustomArr().filter(function (x) { return x && x.q; });',
    '                if (truthState.source === \'partner\') pool = pool.filter(function (x) { return x.owner && x.owner !== me; });',
    '                if (!pool.length) return { err: \'empty\' };',
    '                const fresh = pool.filter(function (x) { return !used.usedQids.has(\'cu:\' + x.id); });',
    '                if (!fresh.length) return { err: \'exhausted\' };',
    '                const pick = fresh[Math.floor(Math.random() * fresh.length)];',
    '                return { q: pick.q, cat: (truthState.source === \'partner\' ? \'partner\' : \'custom\'), srcQid: \'cu:\' + pick.id };',
    '            }',
    '            const usedQs = used.usedQs;',
    '            let catId = truthState.source;',
    '            if (truthState.source === \'all\') {',
    '                // 全部随机：按「还没答过的题量」加权；答完的分类自动跳过',
    '                const weights = TRUTH_CATS.map(function (c) {',
    '                    const bank = truthQB()[c.id] || [];',
    '                    let freshN = 0;',
    '                    for (let i = 0; i < bank.length; i++) if (!usedQs.has(bank[i])) freshN++;',
    '                    return { id: c.id, w: freshN };',
    '                });',
    '                const total = weights.reduce(function (s, x) { return s + x.w; }, 0);',
    '                if (!total) return { err: \'exhausted\' };',
    '                let r = Math.random() * total;',
    '                catId = weights[0].id;',
    '                for (let i = 0; i < weights.length; i++) { r -= weights[i].w; if (r <= 0) { catId = weights[i].id; break; } }',
    '            }',
    '            const bank = truthQB()[catId] || [];',
    '            if (!bank.length) return { err: \'empty\', cat: catId };',
    '            const freshQs = bank.filter(function (q) { return !usedQs.has(q); });',
    '            if (!freshQs.length) return { err: \'exhausted\', cat: catId };',
    '            const q = freshQs[Math.floor(Math.random() * freshQs.length)];',
    '            return { q: q, cat: catId, srcQid: \'off:\' + q };',
    '        }',
    ''
], CRLF));

// —— 1b) 重写 truthDraw：区分「答完」与「为空」的提示 ——
cutInsert('真心话-重写抽题入口', [
    '        function truthDraw() {'
].join(CRLF), [
    '        function _truthFillCard(q, cat) {'
].join(CRLF), joinNL([
    '        function truthDraw() {',
    '            const pick = _truthPickQuestion();',
    '            if (!pick) {',
    '                showToast(\'这个题库还是空的，先添加几道题吧\');',
    '                return;',
    '            }',
    '            if (pick.err) {',
    '                if (pick.err === \'exhausted\') {',
    '                    showToast(\'🎉 这个来源的题都答过啦！加新题、或在「往期真心话」清空答题记录后再抽\');',
    '                } else {',
    '                    showToast(truthState.source === \'partner\' ? \'TA 还没有出题，让 TA 先加几道吧\' : \'这个分类还没有题，先添加几道吧\');',
    '                }',
    '                return;',
    '            }',
    '            truthState.pending = pick;',
    '            truthState.sticker = \'\';',
    '            truthState.currentId = null;',
    '            const input = document.getElementById(\'truthAnswerInput\');',
    '            if (input) input.value = \'\';',
    '            _truthUpdateCharCount();',
    '            _truthRenderStickerRow();',
    '            _truthPlayState(\'drawn\');',
    '            _truthFillCard(pick.q, pick.cat);',
    '            try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) {} // 移动端轻微震动，仪式感',
    '        }',
    ''
], CRLF));

// —— 1c) 寄出答案时记入 truthAnswered ——
replaceOnce('真心话-记录答题', [
    '            _truthArr().unshift(rec);',
    '            if (_truthArr().length > TRUTH_QA_CAP) _truthArr().length = TRUTH_QA_CAP;'
].join(CRLF), [
    '            _truthArr().unshift(rec);',
    '            if (_truthArr().length > TRUTH_QA_CAP) _truthArr().length = TRUTH_QA_CAP;',
    '            if (!Array.isArray(appData.truthAnswered)) appData.truthAnswered = [];',
    '            if (appData.truthAnswered.indexOf(pick.srcQid) < 0) appData.truthAnswered.unshift(pick.srcQid);',
    '            if (appData.truthAnswered.length > 3000) appData.truthAnswered.length = 3000;'
].join(CRLF));

// —— 1d) 往期真心话：加「清空答题记录」按钮 ——
replaceOnce('真心话-清空记录按钮', [
    '                    <p class="text-sm font-semibold text-[#5E3A20]">📜 往期真心话</p>',
    '                </div>',
    '                <div id="truthHistoryList"></div>'
].join(CRLF), [
    '                    <p class="text-sm font-semibold text-[#5E3A20]">📜 往期真心话</p>',
    '                </div>',
    '                <div class="flex justify-end mb-2">',
    '                    <button onclick="truthResetAnswered()" class="text-[10px] text-[#B08968] underline active:scale-95 transition-transform">🧹 清空答题记录（抽过的题可重抽）</button>',
    '                </div>',
    '                <div id="truthHistoryList"></div>'
].join(CRLF));

// —— 1e) truthResetAnswered 函数 ——
replaceOnce('真心话-清空记录函数', [
    '        function truthRenderHistory() {'
].join(CRLF), joinNL([
    '        function truthResetAnswered() {',
    '            if (!confirm(\'清空答题记录？\\r\\n\\r\\n· 抽过的题都可以重新抽到\\r\\n· 往期真心话的回答内容不会被删除\')) return;',
    '            appData.truthAnswered = [];',
    '            saveData();',
    '            showToast(\'🧹 答题记录已清空，所有题目重新可抽\');',
    '        }',
    '',
    '        function truthRenderHistory() {'
], CRLF));

// —— 2a) 情话轮放起点：常量 ——
replaceOnce('情话-起点常量', [
    "    const LOVE_QUOTE_KEY = 'lizi_love_quote_idx';"
].join(CRLF), [
    "    const LOVE_QUOTE_KEY = 'lizi_love_quote_idx';",
    "    const LOVE_QUOTE_START_KEY = 'lizi_love_quote_start_applied';"
].join(CRLF));

// —— 2b) 情话轮放起点：应用函数 ——
replaceOnce('情话-起点函数', [
    '    function startLoveQuoteLoop() {'
].join(CRLF), [
    '    // 云端「轮放起点」：love-quotes.json 的 startIndex（1 起算）。变化时把轮换指针跳到第 N 句',
    '    function _loveQuoteApplyStart() {',
    '        try {',
    '            if (typeof loveQuoteStartIndex !== \'function\') return;',
    '            const list = _loveQuoteList();',
    '            const s = loveQuoteStartIndex(list.length);',
    '            const applied = parseInt(localStorage.getItem(LOVE_QUOTE_START_KEY) || \'0\', 10);',
    '            if (applied !== s) {',
    '                localStorage.setItem(LOVE_QUOTE_KEY, String(Math.max(0, s - 1)));',
    '                localStorage.setItem(LOVE_QUOTE_START_KEY, String(s));',
    '            }',
    '        } catch (e) {}',
    '    }',
    '    function startLoveQuoteLoop() {'
].join(CRLF));

// —— 2c) 启动时应用起点 ——
replaceOnce('情话-启动应用', [
    '        _rotateLoveQuote(true);'
].join(CRLF), [
    '        _loveQuoteApplyStart();',
    '        _rotateLoveQuote(true);'
].join(CRLF));

fs.writeFileSync(file, html, 'utf8');
console.log('✅ index.html 已完成 ' + changed + ' 处修订。');

// —— quotes-bank.js：loveQuoteStartIndex() ——
const qbFile = path.join(__dirname, 'quotes-bank.js');
let qb = fs.readFileSync(qbFile, 'utf8');
const nl = qb.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const anchor = '    window.loveQuotesLoadCloud = function () {';
const i = qb.indexOf(anchor);
if (i < 0) { console.error('❌ quotes-bank.js 未找到锚点'); process.exit(1); }
if (qb.indexOf('loveQuoteStartIndex') >= 0) { console.log('[SKIP] quotes-bank.js 已含 loveQuoteStartIndex'); }
else {
    const fn = [
        '    // 轮放起点（1 起算）：云端下发 startIndex，缺省 1；钳制到 1～列表长度',
        '    window.loveQuoteStartIndex = function (listLen) {',
        '        var n = 1;',
        '        try { n = parseInt(window.LOVE_QUOTES_CLOUD && window.LOVE_QUOTES_CLOUD.startIndex, 10); } catch (e) { }',
        '        if (isNaN(n) || n < 1) n = 1;',
        '        if (listLen && n > listLen) n = listLen;',
        '        return n;',
        '    };',
        ''
    ].join(nl);
    qb = qb.slice(0, i) + fn + qb.slice(i);
    fs.writeFileSync(qbFile, qb, 'utf8');
    console.log('[OK] quotes-bank.js 已加入 loveQuoteStartIndex()');
}
