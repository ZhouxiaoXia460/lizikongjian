// 3.3 家具库底部抽屉补丁（弹性匹配 \r?\n，兼容混合行尾）
// 用法：node _opt1.cjs   （对 index.html 就地修改）
const fs = require('fs');
const FILE = require('path').join(__dirname, 'index.html');
let c = fs.readFileSync(FILE, 'utf8');
let applied = 0;
function rep(oldS, newS, label) {
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reSrc = oldS.split('\n').map(esc).join('\\r?\\n');
    const re = new RegExp(reSrc);
    const n = (c.match(new RegExp(reSrc, 'g')) || []).length;
    if (n === 0) throw new Error('未找到锚点：' + label);
    if (n > 1) throw new Error('锚点不唯一（' + n + ' 次）：' + label);
    c = c.replace(re, newS.replace(/\$/g, '$$$$'));
    applied++;
}

// 1) HTML：家具库抽屉头部（主入口「收起 ▾」居中 + 保留小三角辅助入口）
rep(`                <div id="isoLib" class="mt-3 bg-white border border-[#F5DEC2] rounded-2xl overflow-hidden">
                    <button onclick="toggleIsoLib()" class="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[#5E3A20] hover:bg-[#FFF4E5] transition-colors">
                        <span>🪑 家具库（全解锁 · 按住家具拖进房间 / 点击拿起）</span>
                        <span id="isoLibChevron" class="transition-transform">▾</span>
                    </button>
                    <div id="isoLibBody" class="px-3 pb-3">`,
`                <div id="isoLib">
                    <div class="iso-lib-grab"></div>
                    <div class="iso-lib-head">
                        <span class="iso-lib-title">🪑 家具库<em>全解锁 · 按住家具拖进房间 / 点击拿起</em></span>
                        <button onclick="toggleIsoLib()" class="iso-lib-collapse">收起 ▾</button>
                        <button onclick="toggleIsoLib()" id="isoLibChevron" class="iso-lib-chev" title="收起/展开家具库">▾</button>
                    </div>
                    <div id="isoLibBody" class="px-3 pb-3">`, 'lib-html');

// 2) CSS：底部抽屉样式（全端统一）+ FAB 常显 + 展开时隐藏 FAB
rep(`        #isoLibFab { display: none; }
        #gameRoomPage { overscroll-behavior: contain; }`,
`        #gameRoomPage { overscroll-behavior: contain; }
        /* —— 3.3 家具库：底部抽屉（深色磨砂毛玻璃，默认展开约半屏，顶部保留房间画布可视；全端统一） —— */
        #isoLib { position: fixed; left: 50%; bottom: calc(88px + env(safe-area-inset-bottom, 0px)); width: min(620px, calc(100% - 16px)); z-index: 70; transform: translate(-50%, 130%); opacity: 0; pointer-events: none; border-radius: 22px; border: 1.5px solid rgba(245, 222, 194, 0.4); background: rgba(44, 33, 22, 0.82); backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%); box-shadow: 0 -12px 42px rgba(30, 18, 8, 0.38); transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease; color: #FFF6EA; }
        #isoLib.lib-open { transform: translate(-50%, 0); opacity: 1; pointer-events: auto; }
        .iso-lib-grab { width: 46px; height: 5px; border-radius: 5px; background: rgba(255, 246, 234, 0.32); margin: 8px auto 0; }
        .iso-lib-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 12px 8px; }
        .iso-lib-title { font-size: 13px; font-weight: 700; color: #FFF6EA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .iso-lib-title em { font-style: normal; font-weight: 500; font-size: 10px; color: rgba(255, 246, 234, 0.72); margin-left: 6px; }
        .iso-lib-collapse { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 4px; padding: 7px 18px; border-radius: 999px; border: 1.5px solid rgba(245, 222, 194, 0.52); background: rgba(255, 246, 234, 0.14); color: #FFF6EA; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.16s ease; white-space: nowrap; }
        .iso-lib-collapse:active { transform: translateX(-50%) scale(0.92); }
        .iso-lib-chev { width: 34px; height: 34px; flex: 0 0 auto; border-radius: 50%; border: 1.5px solid rgba(245, 222, 194, 0.35); background: rgba(255, 246, 234, 0.1); color: #FFF6EA; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease; }
        #isoLibBody { max-height: 44vh; overflow-y: auto; -webkit-overflow-scrolling: touch; border-top: 1px solid rgba(245, 222, 194, 0.18); padding-top: 8px; }
        #isoLib .iso-space-tab { background: rgba(255, 251, 245, 0.94); }
        #isoLib .iso-space-tab.selected { background: linear-gradient(135deg, #FFE8CC, #FFF4E5); }
        #isoComboRow > span { color: rgba(255, 246, 234, 0.75) !important; }
        #isoLibFab { display: flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 0.18s ease; }
        #isoEditView.lib-open #isoLibFab { opacity: 0; pointer-events: none; }`, 'lib-css');

// 3) 移动端媒体查询：去掉旧 fixed 抽屉规则（新基础样式已覆盖）
rep(`            #isoLibFab { display: flex; align-items: center; justify-content: center; }
            #isoLib { position: fixed; left: 10px; right: 10px; bottom: 88px; z-index: 70; margin-top: 0 !important; transform: translateY(135%); transition: transform 0.28s ease; box-shadow: 0 -10px 34px rgba(94, 58, 32, 0.22); }
            #isoLib.sheet-open { transform: translateY(0); }
            #isoLibBody { max-height: 40vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
            #isoLibTabs, #isoSpaceTabs, #isoFloorToggles, #isoThemeRow, #isoComboRow { flex-wrap: nowrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }`,
`            #isoLibFab { display: flex; align-items: center; justify-content: center; }
            #isoLibTabs, #isoSpaceTabs, #isoFloorToggles, #isoThemeRow, #isoComboRow { flex-wrap: nowrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }`, 'lib-mobile-css');

// 4) JS：开合逻辑改为统一抽屉
rep(`    function toggleIsoLib() {
        const lib = document.getElementById('isoLib');
        const mobile = window.matchMedia && window.matchMedia('(max-width: 639px)').matches;
        if (mobile && lib) {
            // 手机端：底部弹出式抽屉
            lib.classList.toggle('sheet-open');
            isoLibOpen = lib.classList.contains('sheet-open');
            const body = document.getElementById('isoLibBody');
            if (body) body.classList.remove('hidden');
        } else {
            isoLibOpen = !isoLibOpen;
            document.getElementById('isoLibBody').classList.toggle('hidden', !isoLibOpen);
        }
        const ch = document.getElementById('isoLibChevron');
        if (ch) ch.textContent = isoLibOpen ? '▾' : '▸';
    }`,
`    function _setIsoLibOpen(open) {
        isoLibOpen = !!open;
        const lib = document.getElementById('isoLib');
        if (lib) lib.classList.toggle('lib-open', isoLibOpen);
        const editView = document.getElementById('isoEditView');
        if (editView) editView.classList.toggle('lib-open', isoLibOpen); // 联动隐藏家具库 FAB
        const ch = document.getElementById('isoLibChevron');
        if (ch) ch.textContent = isoLibOpen ? '▾' : '▸';
    }
    function toggleIsoLib() { _setIsoLibOpen(!isoLibOpen); }`, 'lib-toggle');

// 5) 进编辑器自动展开抽屉
rep(`        isoLibCat = _defaultLibCatFor(key);
        _renderIsoTabs();
        _renderIsoThemeRow();
        _renderIsoCombos();
        _renderIsoLib();
        _updateIsoNightBtns();`,
`        isoLibCat = _defaultLibCatFor(key);
        _renderIsoTabs();
        _renderIsoThemeRow();
        _renderIsoCombos();
        _renderIsoLib();
        _setIsoLibOpen(true); // 进编辑器自动展开底部抽屉（默认展开约半屏，顶部保留画布可视）
        _updateIsoNightBtns();`, 'lib-auto-open');

// 6) 点画布区域自动收起家具库
rep(`            isoLastPointerType = ev.pointerType || 'mouse';
            if (ev.target.closest && ev.target.closest('button')) return; // 视口内 UI 按钮（缩放/操作栏/家具库）不触发画布交互
            activePtrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });`,
`            isoLastPointerType = ev.pointerType || 'mouse';
            if (ev.target.closest && ev.target.closest('button')) return; // 视口内 UI 按钮（缩放/操作栏/家具库）不触发画布交互
            if (isoLibOpen) _setIsoLibOpen(false); // 点击面板外画布区域：自动收起家具库（3.3）
            activePtrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });`, 'lib-outside-close');

fs.writeFileSync(FILE, c, 'utf8');
console.log('✓ 3.3 全部 ' + applied + ' 处替换完成');
