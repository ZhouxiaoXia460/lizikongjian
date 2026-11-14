// 栗子空间 - 真心话体验修订：
// 1) 移除「清空答题记录」；改为「删除某条往期记录 → 那道题才重新可抽」（去掉 truthAnswered 独立记录）
// 2) 历史视图加「← 返回抽题」；抽了没答的题在 历史↔抽题、退出重进 之间都保留可继续作答
// 3) 历史下滑时右上角浮现「↑ 回到顶部」
const fs = require('fs');
const CRLF = '\r\n';
function J(lines) { return lines.join(CRLF); }

const file = 'index.html';
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

if (html.indexOf('truthBackToPlay') >= 0) { console.error('❌ 疑似重复执行，中止'); process.exit(1); }

// —— 1) 历史视图头部：加「← 返回抽题」，删「清空答题记录」，加浮动回顶按钮 ——
replaceOnce('历史头部改造', J([
    '                    <p class="text-sm font-semibold text-[#5E3A20]">📜 往期真心话</p>',
    '                </div>',
    '                <div class="flex justify-end mb-2">',
    '                    <button onclick="truthResetAnswered()" class="text-[10px] text-[#B08968] underline active:scale-95 transition-transform">🧹 清空答题记录（抽过的题可重抽）</button>',
    '                </div>',
    '                <div id="truthHistoryList"></div>'
]), J([
    '                    <button onclick="truthBackToPlay()" class="text-[#85532E] text-sm font-medium px-3 py-1.5 -ml-3 rounded-xl hover:bg-[#FFF4E5] transition-colors flex-shrink-0">← 返回抽题</button>',
    '                    <p class="text-sm font-semibold text-[#5E3A20]">📜 往期真心话</p>',
    '                    <span class="w-6"></span>',
    '                </div>',
    '                <div id="truthHistoryList"></div>',
    '                <button id="truthTopBtn" onclick="truthScrollTop()" class="hidden" style="position:fixed;top:70px;right:14px;z-index:40;border:1px solid #F5DEC2;background:rgba(255,255,255,.96);color:#85532E;font-size:12px;font-weight:600;padding:7px 12px;border-radius:999px;box-shadow:0 4px 14px rgba(139,90,43,.22);">↑ 回到顶部</button>'
]));

// —— 2) 去重只看往期记录（删除 truthAnswered 独立封禁）——
replaceOnce('_truthUsedSets 重写', J([
    '        function _truthUsedSets() {',
    '            // 已答过的题 = 往期记录 + 答题记录 truthAnswered（与往期记录独立：删记录不会让题自动复活，可用「清空答题记录」重置）',
    '            const usedQids = new Set(_truthArr().map(function (r) { return r.srcQid || \'\'; }));',
    '            if (!Array.isArray(appData.truthAnswered)) appData.truthAnswered = [];',
    '            appData.truthAnswered.forEach(function (id) { if (id) usedQids.add(id); });',
    '            const usedQs = new Set(_truthArr().filter(function (r) { return r.src === \'official\'; }).map(function (r) { return r.q; }));',
    '            appData.truthAnswered.forEach(function (id) { if (id && id.indexOf(\'off:\') === 0) usedQs.add(id.slice(4)); });',
    '            return { usedQids: usedQids, usedQs: usedQs };',
    '        }'
]), J([
    '        function _truthUsedSets() {',
    '            // 已抽过/答过的题：只看「往期真心话记录」；删除某条记录后，那道题才会重新可抽',
    '            const usedQids = new Set(_truthArr().map(function (r) { return r.srcQid || \'\'; }));',
    '            const usedQs = new Set(_truthArr().filter(function (r) { return r.src === \'official\'; }).map(function (r) { return r.q; }));',
    '            return { usedQids: usedQids, usedQs: usedQs };',
    '        }'
]));

// —— 3) 寄出答案不再写入 truthAnswered ——
replaceOnce('truthSendAnswer 清理', J([
    '            if (_truthArr().length > TRUTH_QA_CAP) _truthArr().length = TRUTH_QA_CAP;',
    '            if (!Array.isArray(appData.truthAnswered)) appData.truthAnswered = [];',
    '            if (appData.truthAnswered.indexOf(pick.srcQid) < 0) appData.truthAnswered.unshift(pick.srcQid);',
    '            if (appData.truthAnswered.length > 3000) appData.truthAnswered.length = 3000;'
]), J([
    '            if (_truthArr().length > TRUTH_QA_CAP) _truthArr().length = TRUTH_QA_CAP;'
]));

// —— 4) 删除 truthResetAnswered 函数 ——
replaceOnce('删除清空记录函数', J([
    '        function truthResetAnswered() {',
    "            if (!confirm('清空答题记录？\\r\\n\\r\\n· 抽过的题都可以重新抽到\\r\\n· 往期真心话的回答内容不会被删除')) return;",
    '            appData.truthAnswered = [];',
    '            saveData();',
    "            showToast('🧹 答题记录已清空，所有题目重新可抽');",
    '        }',
    '',
    '        function truthRenderHistory() {'
]), J([
    '        function truthRenderHistory() {'
]));

// —— 5) 答完提示改为「删记录放生」口径 ——
replaceOnce('答完提示文案',
    "                    showToast('🎉 这个来源的题都答过啦！加新题、或在「往期真心话」清空答题记录后再抽');",
    "                    showToast('🎉 这个来源的题都答过啦！在「往期真心话」删掉对应记录，那道题就能重新抽到');");

// —— 6) 进入真心话页不再清空已抽的题（保留可继续作答）——
replaceOnce('openTruthGame 保留现场', J([
    "            showPage('truthPage');",
    "            truthState.tab = 'play';",
    '            truthState.pending = null;',
    '            truthState.currentId = null;',
    '            _truthSwitchView();',
    "            _truthPlayState('idle');",
    '            truthSetSource(truthState.source);'
]), J([
    "            showPage('truthPage');",
    "            truthState.tab = 'play';",
    '            _truthSwitchView();',
    '            truthSetSource(truthState.source);',
    '            _truthRestorePlayState();'
]));

// —— 7) truthSetSource：只有切换来源才清现场 ——
replaceOnce('truthSetSource 开头',
    '        function truthSetSource(src) {',
    J([
        '        function truthSetSource(src) {',
        '            const _tsChanged = (truthState.source !== src);'
    ]));
replaceOnce('truthSetSource 清理块', J([
    '            // 切换标签即回到抽题原始界面：清掉上一道没寄出的题',
    '            truthState.pending = null;',
    '            truthState.currentId = null;',
    "            truthState.sticker = '';",
    "            const input = document.getElementById('truthAnswerInput');",
    "            if (input) input.value = '';",
    '            _truthUpdateCharCount();',
    "            if (src === 'custom') {",
    '                truthRenderCustom();',
    '            } else {',
    "                _truthPlayState('idle');",
    '            }'
]), J([
    '            // 只有切换来源（分类）时才清掉上一道没寄出的题；重进页面恢复现场时不清理',
    '            if (_tsChanged) {',
    '                truthState.pending = null;',
    '                truthState.currentId = null;',
    "                truthState.sticker = '';",
    "                const input = document.getElementById('truthAnswerInput');",
    "                if (input) input.value = '';",
    '            }',
    '            _truthUpdateCharCount();',
    "            if (src === 'custom') {",
    '                truthRenderCustom();',
    '            } else if (_tsChanged) {',
    "                _truthPlayState('idle');",
    '            }'
]));

// —— 8) 翻卡片支持「恢复现场不播动画」——
replaceOnce('_truthFillCard skipAnim', J([
    '        function _truthFillCard(q, cat) {',
    "            const el = document.getElementById('truthCardQ');",
    "            const tag = document.getElementById('truthCardCat');",
    '            if (el) el.textContent = q;',
    '            if (tag) tag.textContent = _truthCatLabel(cat);',
    "            const card = document.getElementById('truthCard3d');",
    '            if (!card) return;',
    "            card.classList.remove('truth-drop');",
    "            card.classList.remove('flipped');",
    '            void card.offsetWidth; // 重置动画',
    "            card.classList.add('truth-drop');"
]), J([
    '        function _truthFillCard(q, cat, skipAnim) {',
    "            const el = document.getElementById('truthCardQ');",
    "            const tag = document.getElementById('truthCardCat');",
    '            if (el) el.textContent = q;',
    '            if (tag) tag.textContent = _truthCatLabel(cat);',
    "            const card = document.getElementById('truthCard3d');",
    '            if (!card) return;',
    "            card.classList.remove('truth-drop');",
    "            card.classList.remove('flipped');",
    '            void card.offsetWidth; // 重置动画',
    '            if (skipAnim) { // 恢复现场：不重播掉落动画，直接呈现翻面后的卡片',
    "                card.classList.add('flipped');",
    '                return;',
    '            }',
    "            card.classList.add('truth-drop');"
]));

// —— 9) 新增：恢复现场 / 返回抽题 / 回到顶部 ——
replaceOnce('新增辅助函数',
    '        function truthSetSource(src) {',
    J([
        '        function _truthRestorePlayState() {',
        '            // 从历史返回 / 重进页面时恢复抽题状态：抽了没答→继续答；已寄出→寄出卡片；否则回到未抽',
        '            if (truthState.pending) {',
        "                _truthPlayState('drawn');",
        '                _truthFillCard(truthState.pending.q, truthState.pending.cat, true);',
        '                _truthUpdateCharCount();',
        '                _truthRenderStickerRow();',
        '            } else if (truthState.currentId && _truthGetRec(truthState.currentId)) {',
        "                _truthPlayState('sent');",
        '                truthRenderSent();',
        '            } else {',
        "                _truthPlayState('idle');",
        '            }',
        '        }',
        '        function truthBackToPlay() {',
        "            truthState.tab = 'play';",
        '            _truthSwitchView();',
        '            _truthRestorePlayState();',
        '            _truthUpdateTopBtn();',
        '        }',
        '        function truthScrollTop() {',
        "            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }",
        '        }',
        '        function _truthUpdateTopBtn() {',
        "            const btn = document.getElementById('truthTopBtn');",
        '            if (!btn) return;',
        '            const y = window.scrollY || document.documentElement.scrollTop || 0;',
        "            btn.classList.toggle('hidden', !(truthState.tab === 'history' && y > 240));",
        '        }',
        "        window.addEventListener('scroll', function () { try { _truthUpdateTopBtn(); } catch (e) {} }, { passive: true });",
        '        function truthSetSource(src) {'
    ]));

// —— 10) 历史↔抽题切换时：返回抽题恢复现场 + 更新回顶按钮 ——
replaceOnce('truthToggleHistory 增强', J([
    '        function truthToggleHistory() {',
    "            truthState.tab = (truthState.tab === 'history') ? 'play' : 'history';",
    "            if (truthState.tab === 'history') truthRenderHistory();",
    '            _truthSwitchView();',
    '            _truthMarkSeen();',
    '        }'
]), J([
    '        function truthToggleHistory() {',
    "            truthState.tab = (truthState.tab === 'history') ? 'play' : 'history';",
    "            if (truthState.tab === 'history') truthRenderHistory();",
    '            _truthSwitchView();',
    "            if (truthState.tab === 'play') _truthRestorePlayState();",
    '            _truthMarkSeen();',
    '            _truthUpdateTopBtn();',
    '        }'
]));

fs.writeFileSync(file, html, 'utf8');
console.log('✅ index.html 已完成 ' + changed + ' 处修订。');
