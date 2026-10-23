// 辈分计算器重设计：内联 relationship.js 引擎 + 重写 kin 逻辑 + UI 调整
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
let fix = 0;
function must(cond, msg) { if (!cond) { console.error('✗ ' + msg); process.exit(1); } fix++; }

// 1) 内联 relationship.js（放在离线工具箱脚本块之前，保证调用时引擎已就绪、纯离线可用）
const lib = fs.readFileSync('_relationship.min.js', 'utf8').trim();
const libMarker = "    <script>\r\n    // ==================== 离线工具箱（🧰 工具库） ====================";
must(html.includes(libMarker), '找不到工具箱脚本块锚点');
if (html.indexOf('relationship.js v1.2.9') < 0) {
    const libBlock = "    <script>\r\n/*! relationship.js v1.2.9 | MIT License | https://github.com/mumuy/relationship | 内联打包，保证纯离线可用 */\r\n" + lib + "\r\n    </script>\r\n";
    html = html.replace(libMarker, libBlock + libMarker);
    must(true, '内联 relationship.js');
}

// 2) 重写辈分计算器 JS（字典引擎 → relationship.js 算法引擎）
const kinStart = "    let kinGender = null; // 'male' | 'female' | null";
const kinEnd = "    // ============ ② 吃什么决定器 ============";
const a = html.indexOf(kinStart);
const b = html.indexOf(kinEnd, a);
must(a > 0 && b > a, '找不到 kin JS 段');
let newKin = `    let kinGender = 'male'; // 我的性别（引擎 sex 参数：老公/老婆链与自身指代需要）
    const KIN_NAME = { f: '爸爸', m: '妈妈', ob: '哥哥', lb: '弟弟', os: '姐姐', ls: '妹妹', s: '儿子', d: '女儿', h: '老公', w: '老婆' };
    const KIN_ALIAS = {
        '爸爸': '爸爸', '爸': '爸爸', '爹': '爸爸', '父亲': '爸爸', '老爸': '爸爸',
        '妈妈': '妈妈', '妈': '妈妈', '娘': '妈妈', '母亲': '妈妈', '老妈': '妈妈',
        '哥哥': '哥哥', '哥': '哥哥', '兄': '哥哥', '兄长': '哥哥',
        '弟弟': '弟弟', '弟': '弟弟',
        '姐姐': '姐姐', '姐': '姐姐',
        '妹妹': '妹妹', '妹': '妹妹',
        '儿子': '儿子', '儿': '儿子',
        '女儿': '女儿',
        '老公': '老公', '丈夫': '老公', '先生': '老公',
        '老婆': '老婆', '妻子': '老婆', '太太': '老婆'
    };
    const KIN_QUICK = {
        '爷爷': '爸爸的爸爸', '外公': '妈妈的爸爸', '舅舅': '妈妈的哥哥', '姨妈': '妈妈的姐姐',
        '婆婆': '老公的妈妈', '岳父': '老婆的爸爸'
    };

    function openToolKin() { showPage('toolKinPage'); kinRecalc('input'); }

    // 口语词归一：把输入拆成引擎认识的标准称呼词
    function _kinParse(text) {
        const parts = String(text || '').split('的').map(s => s.trim()).filter(Boolean);
        const words = [];
        for (let i = 0; i < parts.length; i++) {
            const w = KIN_ALIAS[parts[i]];
            if (!w) return null; // 有不认识的词
            words.push(w);
        }
        return words;
    }

    // 引擎换算：任意长度关系链算法推导（内联 relationship.js，纯本地计算）
    // 返回 { ok, titles[], self, chainText }：titles 为可能称呼（可多个），self 表示链会绕回自己
    function _kinCompute(raw, gender) {
        const words = _kinParse(raw);
        if (!words) return { ok: false, titles: [], self: false, chainText: '' };
        const chainText = words.join('的');
        let res = [];
        try { res = relationship({ text: chainText, sex: gender === 'female' ? 0 : 1 }) || []; } catch (e) { res = []; }
        res = (res || []).filter(t => t && String(t).trim());
        const self = res.indexOf('自己') >= 0 || res.indexOf('我') >= 0;
        const titles = res.filter(t => t !== '自己' && t !== '我');
        return { ok: true, titles: titles, self: self, chainText: chainText };
    }

    function kinSyncGenderBtns() {
        const m = document.getElementById('kinGenderMale'), f = document.getElementById('kinGenderFemale');
        if (!m || !f) return;
        const on = 'flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FFE8CC] to-[#FFF4E5] border border-[#D9A56E] text-[#85532E] shadow-sm transition-all active:scale-95';
        const off = 'flex-1 py-2.5 rounded-xl text-sm font-medium bg-white border border-[#F5DEC2] text-[#B08968] transition-all active:scale-95';
        m.className = kinGender === 'male' ? on : off;
        f.className = kinGender === 'female' ? on : off;
    }

    function kinSetGender(g) {
        kinGender = g;
        kinSyncGenderBtns();
        kinRecalc('gender');
    }

    function kinClickRel(word) {
        const inp = document.getElementById('kinInput');
        const v = (inp.value || '').trim();
        inp.value = v ? (v + '的' + word) : word;
        kinRecalc('click');
    }

    function kinBackspace() {
        const inp = document.getElementById('kinInput');
        const parts = (inp.value || '').split('的').map(s => s.trim()).filter(Boolean);
        parts.pop();
        inp.value = parts.join('的');
        kinRecalc('input');
    }

    function kinClearChain() {
        document.getElementById('kinInput').value = '';
        kinRecalc('input');
    }

    function kinQuick(name) {
        const text = KIN_QUICK[name];
        if (!text) return;
        document.getElementById('kinInput').value = text;
        kinRecalc('input');
    }

    function kinRecalc() {
        const emptyEl = document.getElementById('kinResultEmpty');
        const boxEl = document.getElementById('kinResultBox');
        const titleEl = document.getElementById('kinResultTitle');
        const chainEl = document.getElementById('kinResultChain');
        const noteEl = document.getElementById('kinResultNote');
        const copyEl = document.getElementById('kinCopyBtn');
        if (!emptyEl || !boxEl) return;
        const raw = (document.getElementById('kinInput').value || '').trim();
        if (!raw) {
            emptyEl.classList.remove('hidden'); boxEl.classList.add('hidden');
            return;
        }
        const r = _kinCompute(raw, kinGender);
        emptyEl.classList.add('hidden'); boxEl.classList.remove('hidden');
        if (!r.ok) {
            titleEl.textContent = '暂未找到对应称呼';
            titleEl.className = 'text-xl font-semibold text-[#B08968]';
            chainEl.textContent = '有认不出的称呼词，试试点选组合或换个说法';
            noteEl.classList.add('hidden');
            copyEl.classList.add('hidden');
            return;
        }
        if (!r.titles.length && r.self) {
            titleEl.textContent = '这是你自己呀 😄';
            titleEl.className = 'text-2xl font-bold text-[#A66D3A]';
            chainEl.textContent = '关系链绕回了自己，换个叫法试试';
            noteEl.classList.add('hidden');
            copyEl.classList.add('hidden');
            return;
        }
        if (!r.titles.length) {
            titleEl.textContent = '暂未找到对应称呼';
            titleEl.className = 'text-xl font-semibold text-[#B08968]';
            chainEl.textContent = '试试简化关系表述，或更换基础关系组合';
            noteEl.classList.add('hidden');
            copyEl.classList.add('hidden');
            return;
        }
        titleEl.textContent = r.titles.join('／');
        titleEl.className = 'text-3xl font-bold text-[#5E3A20] tracking-wide break-all';
        chainEl.textContent = '对应关系：' + r.chainText;
        const multi = r.titles.length > 1;
        noteEl.textContent = multi ? '按年龄大小选择称呼' : '';
        noteEl.classList.toggle('hidden', !multi);
        copyEl.classList.remove('hidden');
    }

    function _toolCopyText(text, done) {
        const ok = function () { showToast('已复制，发给TA看看吧'); };
        const cb = (typeof done === 'function') ? done : ok;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(cb).catch(function () { _toolCopyFallback(text, cb); });
        } else _toolCopyFallback(text, cb);
    }
    function _toolCopyFallback(text, cb) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            if (cb) cb(); else showToast('已复制，发给TA看看吧');
        } catch (e) { showToast('复制失败，请手动长按复制'); }
    }
    function kinCopy() {
        const title = (document.getElementById('kinResultTitle').textContent || '').trim();
        if (!title || title === '暂未找到对应称呼' || title === '这是你自己呀 😄') { showToast('请先计算出称呼再复制'); return; }
        _toolCopyText(title);
    }

`;
html = html.slice(0, a) + newKin.replace(/\n/g, '\r\n') + html.slice(b);
must(true, '重写 kin JS');

// 3a) 性别标签改为「我的性别」
const oldLabel = '对方性别 <span class="text-[10px]">（先选性别，再点关系）</span>';
must(html.includes(oldLabel), '找不到性别标签');
html = html.replace(oldLabel, '我的性别 <span class="text-[10px]">（用于称呼换算，如：老公的妈妈→婆婆）</span>');

// 3b) 关系按钮 8 → 10（加 夫/妻），网格 4 列 → 5 列
const gs = html.indexOf('<div class="grid grid-cols-4 gap-2" id="kinRelGrid">');
must(gs > 0, '找不到关系按钮网格');
const ge = html.indexOf('</div>', gs);
must(ge > gs, '关系按钮网格结尾异常');
const btn = (word, label) => '                    <button onclick="kinClickRel(\'' + word + '\')" class="kin-rel py-2.5 rounded-xl text-sm font-semibold bg-[#FFFBF5] border border-[#F5DEC2] text-[#85532E] active:scale-95 transition-all">' + label + '</button>';
const newGrid = '<div class="grid grid-cols-5 gap-2" id="kinRelGrid">\r\n'
    + [btn('爸爸', '父'), btn('妈妈', '母'), btn('哥哥', '兄'), btn('弟弟', '弟'), btn('姐姐', '姐'), btn('妹妹', '妹'), btn('儿子', '子'), btn('女儿', '女'), btn('老公', '夫'), btn('老婆', '妻')].join('\r\n')
    + '\r\n                </div>';
html = html.slice(0, gs) + newGrid + html.slice(ge + 6);

// 3c) 快捷标签加 婆婆 / 岳父
const yyAnchor = 'kinQuick(\'姨妈\')" class="text-[11px] px-3 py-1.5 rounded-full bg-[#FFF4E5] border border-[#F5DEC2] text-[#A66D3A] font-medium active:scale-95 transition-all">姨妈</button>';
must(html.includes(yyAnchor), '找不到快捷标签锚点');
const yyAdd = '\r\n                    <button onclick="kinQuick(\'婆婆\')" class="text-[11px] px-3 py-1.5 rounded-full bg-[#FFF4E5] border border-[#F5DEC2] text-[#A66D3A] font-medium active:scale-95 transition-all">婆婆</button>'
    + '\r\n                    <button onclick="kinQuick(\'岳父\')" class="text-[11px] px-3 py-1.5 rounded-full bg-[#FFF4E5] border border-[#F5DEC2] text-[#A66D3A] font-medium active:scale-95 transition-all">岳父</button>';
html = html.replace(yyAnchor, yyAnchor + yyAdd);

// 3d) 空状态文案（性别不再是前置门槛）
must(html.includes('请选择性别并输入亲属关系'), '找不到空状态文案');
html = html.replace('请选择性别并输入亲属关系', '输入亲属关系，自动算出该怎么称呼');

// 4) 版本号
must(html.includes("const APP_VERSION = '3.13.0';"), '找不到版本号');
html = html.replace("const APP_VERSION = '3.13.0';", "const APP_VERSION = '3.14.0';");

fs.writeFileSync('index.html', html);
console.log('✓ 全部 ' + fix + ' 处修改完成，新大小: ' + html.length);
