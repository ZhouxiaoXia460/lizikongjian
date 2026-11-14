// 少女小屋改造补丁：建筑垂直叠加 + 视觉修正 + 移动端适配
// 用法：node _patch-girl-house.cjs   （对 index.html 就地修改）
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'index.html');
const OVERVIEW = path.join(__dirname, '_p1_overview.txt');
let c = fs.readFileSync(FILE, 'utf8');
const NL = c.includes('\r\n') ? '\r\n' : '\n';
const norm = s => s.replace(/\r?\n/g, NL);
const newOverview = fs.readFileSync(OVERVIEW, 'utf8').replace(/\r?\n/g, NL);

let applied = 0;
function rep(oldS, newS, label) {
    const o = norm(oldS);
    const count = c.split(o).length - 1;
    if (count !== 1) throw new Error('锚点异常（' + label + '）：出现 ' + count + ' 次');
    c = c.replace(o, norm(newS));
    applied++;
}
function replaceBetween(startMark, endMark, replacement, label) {
    const sm = norm(startMark), em = norm(endMark);
    const a = c.indexOf(sm);
    if (a < 0) throw new Error('起始锚点未找到：' + label);
    const b = c.indexOf(em, a);
    if (b < 0) throw new Error('结束锚点未找到：' + label);
    c = c.slice(0, a) + replacement.replace(/\r?\n/g, NL) + c.slice(b);
    applied++;
}

// ============ 1. 大替换：总览渲染（垂直叠加 + 副楼落地 + 统一草坪 + 显隐动画） ============
replaceBetween(
    '    function _renderIsoHouse() {',
    '    // —— 编辑器（保留全部交互） ——',
    newOverview,
    'overview'
);

// ============ 2. 楼层显隐切换 → 平滑动画 ============
rep(`    function toggleIsoFloor(key) {
        if (!isoState.hidden) isoState.hidden = {};
        isoState.hidden[key] = !isoState.hidden[key];
        _isoSave();
        _renderIsoFloorToggles();
        _renderIsoHouse();
    }`,
    `    function toggleIsoFloor(key) {
        if (!isoState.hidden) isoState.hidden = {};
        isoState.hidden[key] = !isoState.hidden[key];
        _isoSave();
        _renderIsoFloorToggles();
        _animateIsoHouse(); // 平滑过渡：剩余楼层垂直移动 + 淡入淡出，自动落地
    }`, 'toggleIsoFloor');

// ============ 3. 墙体：统一左上光源（左亮右深）+ 加厚顶帽 + 圆角墙顶 ============
rep(`        const c0 = P(0, 0), cR = P(G.cols, 0), cL = P(0, G.rows);
        const capT = 6 * S;
        // 右后墙（迎光正面·中亮）+ 顶帽（最亮）；左后墙（背光侧面·最深）→ 三面厚度
        push([[c0[0], c0[1] - WH], [cR[0], cR[1] - WH], [cR[0], cR[1]], [c0[0], c0[1]]], wallFill);
        push([[c0[0], c0[1] - WH - capT], [cR[0], cR[1] - WH - capT], [cR[0], cR[1] - WH], [c0[0], c0[1] - WH]], _shade(theme.wallCap, night ? 0.72 : 1.05), null, Math.max(2, 3.5 * S));
        push([[c0[0], c0[1] - WH], [cL[0], cL[1] - WH], [cL[0], cL[1]], [c0[0], c0[1]]], wallSide);
        push([[c0[0], c0[1] - WH - capT], [cL[0], cL[1] - WH - capT], [cL[0], cL[1] - WH], [c0[0], c0[1] - WH]], _shade(theme.wallCap, night ? 0.62 : 0.9), null, Math.max(2, 3.5 * S));`,
    `        const c0 = P(0, 0), cR = P(G.cols, 0), cL = P(0, G.rows);
        const capT = 8 * S;
        // 统一左上柔和光源：左后墙迎光（亮）、右后墙背光（深），顶帽最亮 → 三面厚度
        push([[c0[0], c0[1] - WH], [cR[0], cR[1] - WH], [cR[0], cR[1]], [c0[0], c0[1]]], wallSide);
        push([[c0[0], c0[1] - WH - capT], [cR[0], cR[1] - WH - capT], [cR[0], cR[1] - WH], [c0[0], c0[1] - WH]], _shade(theme.wallCap, night ? 0.62 : 0.9), null, Math.max(2, 3.5 * S));
        push([[c0[0], c0[1] - WH], [cL[0], cL[1] - WH], [cL[0], cL[1]], [c0[0], c0[1]]], wallFill);
        push([[c0[0], c0[1] - WH - capT], [cL[0], cL[1] - WH - capT], [cL[0], cL[1] - WH], [c0[0], c0[1] - WH]], _shade(theme.wallCap, night ? 0.72 : 1.05), null, Math.max(2, 3.5 * S));
        // 圆角墙顶：三个转角加小圆头，全程无尖锐直角
        [[c0, night ? 0.8 : 1.08], [cR, night ? 0.58 : 0.86], [cL, night ? 0.7 : 1.0]].forEach(function (cn) {
            out.push('<circle cx="' + Math.round(cn[0][0]) + '" cy="' + Math.round(cn[0][1] - WH - capT * 0.35) + '" r="' + Math.round(Math.max(2.5, capT * 0.6)) + '" fill="' + _shade(theme.wallCap, cn[1]) + '"/>');
            if (T) T(cn[0][0] - capT, cn[0][1] - WH - capT * 2, cn[0][0] + capT, cn[0][1] - WH + capT);
        });`, 'walls-light');

// 踢脚线明暗对调（左亮右深）
rep(`        push([[c0[0], c0[1] - 5 * S], [cR[0], cR[1] - 5 * S], [cR[0], cR[1]], [c0[0], c0[1]]], _shade(theme.wall, night ? 0.5 : 0.8));
        push([[c0[0], c0[1] - 5 * S], [cL[0], cL[1] - 5 * S], [cL[0], cL[1]], [c0[0], c0[1]]], _shade(theme.wall, night ? 0.44 : 0.72));`,
    `        push([[c0[0], c0[1] - 5 * S], [cR[0], cR[1] - 5 * S], [cR[0], cR[1]], [c0[0], c0[1]]], _shade(theme.wall, night ? 0.5 : 0.72));
        push([[c0[0], c0[1] - 5 * S], [cL[0], cL[1] - 5 * S], [cL[0], cL[1]], [c0[0], c0[1]]], _shade(theme.wall, night ? 0.44 : 0.8));`, 'baseboard');

// 墙顶内沿亮线对调
rep(`        push([[c0[0], c0[1] - WH + 4 * S], [cR[0], cR[1] - WH + 4 * S], [cR[0], cR[1] - WH + 7 * S], [c0[0], c0[1] - WH + 7 * S]], _shade(theme.wall, night ? 0.78 : 1.1));
        push([[c0[0], c0[1] - WH + 4 * S], [cL[0], cL[1] - WH + 4 * S], [cL[0], cL[1] - WH + 7 * S], [c0[0], c0[1] - WH + 7 * S]], _shade(theme.wall, night ? 0.66 : 0.95));`,
    `        push([[c0[0], c0[1] - WH + 4 * S], [cR[0], cR[1] - WH + 4 * S], [cR[0], cR[1] - WH + 7 * S], [c0[0], c0[1] - WH + 7 * S]], _shade(theme.wall, night ? 0.66 : 0.95));
        push([[c0[0], c0[1] - WH + 4 * S], [cL[0], cL[1] - WH + 4 * S], [cL[0], cL[1] - WH + 7 * S], [c0[0], c0[1] - WH + 7 * S]], _shade(theme.wall, night ? 0.78 : 1.1));`, 'walltop-line');

// 多开两扇窗（墙面细节更丰富）
rep(`        win(2.2); win(4.6);`, `        win(2.2); win(4.6); win(7.4); win(9.8);`, 'windows');

// ============ 4. 楼板侧壁：统一左上光源 ============
rep(`        const wN = night ? 0.6 : 1;
        face(fC, fB, _shade(theme.wood, 0.92 * wN)); // 左前侧（背光，更深）
        face(fA, fB, _shade(theme.wood, 1.02 * wN)); // 右前侧（迎光，更亮）`,
    `        const wN = night ? 0.6 : 1;
        face(fC, fB, _shade(theme.wood, 1.02 * wN)); // 左前侧（迎光，更亮）
        face(fA, fB, _shade(theme.wood, 0.86 * wN)); // 右前侧（背光，更深）`, 'slab-sides');

rep(`        out.push('<line x1="' + Math.round(fC[0]) + '" y1="' + Math.round(fC[1] + 1.5 * S) + '" x2="' + Math.round(fB[0]) + '" y2="' + Math.round(fB[1] + 1.5 * S) + '" stroke="' + _shade(theme.wood, 1.18 * wN) + '" stroke-width="' + Math.max(1.5, 2.2 * S) + '" stroke-linecap="round"/>');
        out.push('<line x1="' + Math.round(fA[0]) + '" y1="' + Math.round(fA[1] + 1.5 * S) + '" x2="' + Math.round(fB[0]) + '" y2="' + Math.round(fB[1] + 1.5 * S) + '" stroke="' + _shade(theme.wood, 1.25 * wN) + '" stroke-width="' + Math.max(1.5, 2.2 * S) + '" stroke-linecap="round"/>');`,
    `        out.push('<line x1="' + Math.round(fC[0]) + '" y1="' + Math.round(fC[1] + 1.5 * S) + '" x2="' + Math.round(fB[0]) + '" y2="' + Math.round(fB[1] + 1.5 * S) + '" stroke="' + _shade(theme.wood, 1.25 * wN) + '" stroke-width="' + Math.max(1.5, 2.2 * S) + '" stroke-linecap="round"/>');
        out.push('<line x1="' + Math.round(fA[0]) + '" y1="' + Math.round(fA[1] + 1.5 * S) + '" x2="' + Math.round(fB[0]) + '" y2="' + Math.round(fB[1] + 1.5 * S) + '" stroke="' + _shade(theme.wood, 1.05 * wN) + '" stroke-width="' + Math.max(1.5, 2.2 * S) + '" stroke-linecap="round"/>');`, 'slab-lines');

// ============ 5. 家具：顶面圆角 + 左上光源 + 柔和右下投影 ============
rep(`    // —— SVG 立体家具渲染：三面着色 + 圆角软边 + emoji 帽 + 主题配色；支持 z0 抬升 / 圆柱 / 屏幕开关 / 灯光发光 ——
    function _furnSVGHTML(k, scale, xAttr, yAttr, themeKey, rot, it) {`,
    `    // —— 顶面圆角路径：把箱体顶面的四个直角变成软圆角（Q 版圆润关键） ——
    function _roundedQuadPath(pts, r) {
        const n = pts.length, seg = [];
        for (let i = 0; i < n; i++) {
            const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
            const v1 = [p1[0] - p0[0], p1[1] - p0[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
            const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
            const rr = Math.min(r, l1 / 2.2, l2 / 2.2);
            const ax = p1[0] - v1[0] / l1 * rr, ay = p1[1] - v1[1] / l1 * rr;
            const bx = p1[0] + v2[0] / l2 * rr, by = p1[1] + v2[1] / l2 * rr;
            seg.push((i === 0 ? 'M' : 'L') + Math.round(ax) + ' ' + Math.round(ay), 'Q' + Math.round(p1[0]) + ' ' + Math.round(p1[1]) + ' ' + Math.round(bx) + ' ' + Math.round(by));
        }
        return seg.join(' ') + ' Z';
    }
    // —— SVG 立体家具渲染：三面着色 + 圆角软边 + emoji 帽 + 主题配色；支持 z0 抬升 / 圆柱 / 屏幕开关 / 灯光发光 ——
    function _furnSVGHTML(k, scale, xAttr, yAttr, themeKey, rot, it) {`, 'rounded-helper');

rep(`                const top = [T1, T2, T3, T4], right = [T2, T3, B3, B2], left = [T4, T3, B3, B4];
                polys.push({ pts: top, fill: _shade(col(p.c), 1.22) });
                polys.push({ pts: right, fill: _shade(col(p.c), 0.97) });
                polys.push({ pts: left, fill: _shade(col(p.c), 0.78) });`,
    `                const top = [T1, T2, T3, T4], right = [T2, T3, B3, B2], left = [T4, T3, B3, B4];
                polys.push({ pts: top, fill: _shade(col(p.c), 1.24), round: true });
                polys.push({ pts: left, fill: _shade(col(p.c), 0.97) });
                polys.push({ pts: right, fill: _shade(col(p.c), 0.76) });`, 'furn-shading');

rep(`        polys.forEach(function (p) {
            inner += '<polygon points="' + p.pts.map(function (pt) { return Math.round(pt[0]) + ',' + Math.round(pt[1]); }).join(' ') + '" fill="' + p.fill + '" stroke="' + p.fill + '" stroke-width="3" stroke-linejoin="round"/>';
        });`,
    `        polys.forEach(function (p) {
            const base = ' fill="' + p.fill + '" stroke="' + p.fill + '" stroke-width="3" stroke-linejoin="round"';
            if (p.round) inner += '<path d="' + _roundedQuadPath(p.pts, 3) + '"' + base + '/>';
            else inner += '<polygon points="' + p.pts.map(function (pt) { return Math.round(pt[0]) + ',' + Math.round(pt[1]); }).join(' ') + '"' + base + '/>';
        });`, 'polys-render');

rep(`        const flat = def.parts.every(function (p) { return p.t === 'L'; }); // 纯平面件（地毯）不投影
        const shRx = Math.min(40, Math.max(12, (maxX - minX) * 0.42));
        if (!flat) ext(-shRx, -shRx * 0.45 - 2, shRx, shRx * 0.45 + 2);
        let inner = '';
        if (!flat) inner += '<ellipse cx="0" cy="0" rx="' + Math.round(shRx) + '" ry="' + Math.round(shRx * 0.45) + '" fill="rgba(94,58,32,0.16)"/>';`,
    `        const flat = def.parts.every(function (p) { return p.t === 'L'; }); // 纯平面件（地毯）不投影
        const shRx = Math.min(40, Math.max(12, (maxX - minX) * 0.42));
        if (!flat) ext(-shRx, -shRx * 0.45 - 2, shRx * 1.5, shRx * 0.72);
        let inner = '';
        if (!flat) {
            // 柔和虚化落地阴影：径向渐变 + 右下偏移（配合统一左上光源）
            inner += '<defs><radialGradient id="furnShG"><stop offset="0%" stop-color="rgba(94,58,32,0.20)"/><stop offset="65%" stop-color="rgba(94,58,32,0.09)"/><stop offset="100%" stop-color="rgba(94,58,32,0)"/></radialGradient></defs>';
            inner += '<ellipse cx="' + Math.round(shRx * 0.4) + '" cy="' + Math.round(shRx * 0.2) + '" rx="' + Math.round(shRx) + '" ry="' + Math.round(shRx * 0.44) + '" fill="url(#furnShG)"/>';
        }`, 'furn-shadow');

// ============ 6. 画布常亮：App 深色模式不压暗小屋 ============
rep(`        const vpEl = document.getElementById('isoViewport');
        if (vpEl) {
            const appDark = document.documentElement.classList.contains('dark');
            vpEl.style.background = night
                ? 'linear-gradient(180deg, #232748 0%, #3A3F6E 100%)'
                : (appDark ? 'linear-gradient(180deg, #1E1710 0%, #17110B 100%)' : '');
        }`,
    `        const vpEl = document.getElementById('isoViewport');
        if (vpEl) {
            // 画布全天保持明亮奶白（App 深色模式也不压暗小屋）；夜晚模式除外
            vpEl.style.background = night ? 'linear-gradient(180deg, #2A2E55 0%, #3A4070 100%)' : '';
        }`, 'world-bg');

rep(`        html.dark #isoViewport { background: linear-gradient(180deg, #1E1710 0%, #17110B 100%) !important; border-color: #3A2D1D; }`,
    `        html.dark #isoViewport { border-color: #3A2D1D; } /* 画布保持明亮：小屋像暗房里亮着的模型灯 */`, 'dark-viewport');

// ============ 7. 移动端：触屏长按 → 选中并弹底部操作栏 ============
rep(`    function _openIsoCtx(x, y, itemId) {
        _closeIsoCtx();
        const it = isoState.spaces[isoSpaceKey].items.find(i => i.id === itemId);
        if (!it) return;
        const def = FURN_DEF[it.k] || {};`,
    `    function _openIsoCtx(x, y, itemId, fromTouch) {
        _closeIsoCtx();
        const it = isoState.spaces[isoSpaceKey].items.find(i => i.id === itemId);
        if (!it) return;
        if (fromTouch) {
            // 触屏：长按 = 选中并弹出底部操作栏（旋转/复制/开关/收起），替代右键菜单
            isoSelId = itemId;
            _renderIsoItems();
            _updateIsoItemBar();
            return;
        }
        const def = FURN_DEF[it.k] || {};`, 'ctx-touch');

rep(`                    _openIsoCtx(h.x, h.y, h.id);`, `                    _openIsoCtx(h.x, h.y, h.id, true);`, 'ctx-call');

// ============ 8. 家具库：手机端底部抽屉 ============
rep(`    function toggleIsoLib() {
        isoLibOpen = !isoLibOpen;
        document.getElementById('isoLibBody').classList.toggle('hidden', !isoLibOpen);
        document.getElementById('isoLibChevron').textContent = isoLibOpen ? '▾' : '▸';
    }`,
    `    function toggleIsoLib() {
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
    }`, 'toggle-lib');

// 家具库图标放大一点
rep(`onpointerdown="isoLibDragStart(event, \\'' + k + '\\')">' + _furnSVGHTML(k, 0.55,`,
    `onpointerdown="isoLibDragStart(event, \\'' + k + '\\')">' + _furnSVGHTML(k, 0.62,`, 'lib-scale');

// ============ 9. 复制家具（底部操作栏用） ============
rep(`    function isoRemoveSelected() { if (isoSelId) isoRemoveById(isoSelId); }`,
    `    function isoRemoveSelected() { if (isoSelId) isoRemoveById(isoSelId); }
    // 复制一件：在附近找空格放下（底部操作栏 / 右键菜单共用）
    function isoCopySelected() {
        const item = isoState.spaces[isoSpaceKey].items.find(i => i.id === isoSelId);
        if (!item) { showToast('先点一件家具选中它'); return; }
        isoPushUndo();
        const clone = JSON.parse(JSON.stringify(item));
        clone.id = 'fu_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
        const occupied = function (gx, gy) { return isoState.spaces[isoSpaceKey].items.some(i => Math.abs(i.gx - gx) < 0.5 && Math.abs(i.gy - gy) < 0.5); };
        const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2]];
        for (let i = 0; i < dirs.length; i++) {
            const cx = item.gx + dirs[i][0], cy = item.gy + dirs[i][1];
            if (cx >= 0 && cx < ISO_GRID.cols && cy >= 0 && cy < ISO_GRID.rows && !occupied(cx, cy)) { clone.gx = cx; clone.gy = cy; break; }
        }
        isoState.spaces[isoSpaceKey].items.push(clone);
        isoSelId = clone.id;
        _isoSave();
        _renderIsoItems();
        _updateIsoItemBar();
        showToast('📋 已复制一件');
    }`, 'copy-selected');

// 导出新函数（onclick 桥接）
rep(`'openGameRoom', 'selectIsoSpace', 'closeIsoEdit', 'setIsoSpace', 'setIsoTheme', 'toggleIsoLib', 'clearIsoSpace', 'isoRotateSelected', 'isoRemoveSelected', 'setIsoLibCat', 'toggleIsoFloor', 'applyIsoSample', 'isoZoomBtn', 'fitIsoViewBtn',`,
    `'openGameRoom', 'selectIsoSpace', 'closeIsoEdit', 'setIsoSpace', 'setIsoTheme', 'toggleIsoLib', 'clearIsoSpace', 'isoRotateSelected', 'isoRemoveSelected', 'isoCopySelected', 'setIsoLibCat', 'toggleIsoFloor', 'applyIsoSample', 'isoZoomBtn', 'fitIsoViewBtn',`, 'exports');

// ============ 10. HTML：视口内浮动操作栏 + 家具库悬浮按钮 ============
rep(`                <div id="isoViewport">
                    <div id="isoWorld"></div>
                    <button id="isoFocusExit" onclick="toggleIsoFocus()" class="hidden absolute left-3 top-3 px-3 py-2 rounded-xl bg-white/95 border border-[#F5DEC2] shadow-md text-xs font-semibold text-[#85532E] active:scale-95 transition-transform">✕ 退出专注</button>
                    <div class="absolute right-3 bottom-3 flex flex-col gap-2" style="z-index:30;">
                        <button onclick="isoZoomBtn(1.25)" class="w-11 h-11 rounded-2xl bg-white/95 border border-[#F5DEC2] shadow-md text-xl font-bold text-[#85532E] active:scale-95 transition-transform">＋</button>
                        <button onclick="isoZoomBtn(0.8)" class="w-11 h-11 rounded-2xl bg-white/95 border border-[#F5DEC2] shadow-md text-xl font-bold text-[#85532E] active:scale-95 transition-transform">−</button>
                        <button onclick="fitIsoViewBtn()" class="w-11 h-11 rounded-2xl bg-white/95 border border-[#F5DEC2] shadow-md text-base text-[#85532E] active:scale-95 transition-transform">⛶</button>
                    </div>
                </div>`,
    `                <div id="isoViewport">
                    <div id="isoWorld"></div>
                    <button id="isoFocusExit" onclick="toggleIsoFocus()" class="hidden absolute left-3 top-3 px-3 py-2 rounded-xl bg-white/95 border border-[#F5DEC2] shadow-md text-xs font-semibold text-[#85532E] active:scale-95 transition-transform">✕ 退出专注</button>
                    <button id="isoLibFab" onclick="toggleIsoLib()" class="absolute left-3 bottom-3 w-12 h-12 rounded-2xl bg-white/95 border-2 border-[#F5DEC2] shadow-md text-xl active:scale-95 transition-transform" style="z-index:30;">🪑</button>
                    <div class="absolute right-3 bottom-3 flex flex-col gap-2" style="z-index:30;">
                        <button onclick="isoZoomBtn(1.25)" class="w-11 h-11 rounded-2xl bg-white/95 border border-[#F5DEC2] shadow-md text-xl font-bold text-[#85532E] active:scale-95 transition-transform">＋</button>
                        <button onclick="isoZoomBtn(0.8)" class="w-11 h-11 rounded-2xl bg-white/95 border border-[#F5DEC2] shadow-md text-xl font-bold text-[#85532E] active:scale-95 transition-transform">−</button>
                        <button onclick="fitIsoViewBtn()" class="w-11 h-11 rounded-2xl bg-white/95 border border-[#F5DEC2] shadow-md text-base text-[#85532E] active:scale-95 transition-transform">⛶</button>
                    </div>
                    <div id="isoItemBar" class="hidden absolute left-1/2 bottom-3 items-center gap-1 bg-white/95 border-2 border-[#F5DEC2] rounded-full shadow-lg p-1" style="z-index:35; transform:translateX(-50%);">
                        <span id="isoItemSelected" class="text-xs font-bold text-[#5E3A20] pl-2 pr-1 whitespace-nowrap"></span>
                        <button id="isoItemToggle" onclick="isoToggleSelected()" class="hidden iso-act-btn">💡</button>
                        <button onclick="isoCopySelected()" class="iso-act-btn" title="复制一件">📋</button>
                        <button onclick="isoRotateSelected()" class="iso-act-btn" title="旋转 90°">🔄</button>
                        <button onclick="isoRemoveSelected()" class="iso-act-btn" title="收起" style="color:#C2543A;">🗑</button>
                    </div>
                </div>`, 'viewport-html');

// 删除旧的视口外操作栏
rep(`                <div id="isoItemBar" class="hidden mt-3 items-center gap-2 bg-white border border-[#F5DEC2] rounded-2xl p-2 flex-wrap">
                    <span id="isoItemSelected" class="text-sm font-semibold text-[#5E3A20] px-1"></span>
                    <span class="text-[10px] text-[#B08968] flex-1">已选中：R 旋转 · 拖动换位置 · 右键更多操作</span>
                    <button id="isoItemToggle" onclick="isoToggleSelected()" class="hidden text-xs px-3 py-1.5 rounded-lg bg-[#FFF4E5] text-[#85532E] border border-[#F5DEC2] active:scale-95">💡 开关</button>
                    <button onclick="isoRotateSelected()" class="text-xs px-3 py-1.5 rounded-lg bg-[#FFF4E5] text-[#85532E] border border-[#F5DEC2] active:scale-95">🔄 旋转 (R)</button>
                    <button onclick="isoRemoveSelected()" class="text-xs px-3 py-1.5 rounded-lg bg-white text-[#C2543A] border border-[#F5DEC2] active:scale-95">🗑 收起</button>
                </div>
`, ``, 'old-itembar');

// 编辑器底部提示文案加入触屏说明
rep(`🖱 滚轮缩放 · 空格+拖动平移 · Ctrl+Z 撤销 / Ctrl+Y 重做 · R 旋转 · 右键菜单：旋转/复制/开关/收起 · 靠墙自动贴齐 · 布置自动保存在本机`,
    `🖱 滚轮缩放 · 📱 双指缩放 / 单指平移 / 点选家具弹底部操作栏 / 长按更多操作 · R 旋转 · 右键菜单：旋转/复制/开关/收起 · 靠墙自动贴齐 · 布置自动保存在本机`, 'hint');

// ============ 11. CSS：操作栏按钮 / 手机抽屉 / 触控适配 ============
rep(`        .iso-pal-char .pal-zzz { position: absolute; top: -14px; right: -9px; font-size: 11px; animation: pal-zzz-float 1.6s ease-in-out infinite; }`,
    `        .iso-pal-char .pal-zzz { position: absolute; top: -14px; right: -9px; font-size: 11px; animation: pal-zzz-float 1.6s ease-in-out infinite; }
        /* —— 选中家具底部操作栏（触屏友好，按钮 ≥42px） —— */
        .iso-act-btn { min-width: 42px; height: 42px; padding: 0 11px; border-radius: 999px; background: #FFF4E5; border: 1.5px solid #F5DEC2; font-size: 16px; line-height: 1; cursor: pointer; transition: transform 0.12s ease; }
        .iso-act-btn:active { transform: scale(0.88); }
        #isoLibFab { display: none; }
        #gameRoomPage { overscroll-behavior: contain; }
        @media (max-width: 639px) {
            #isoLibFab { display: flex; align-items: center; justify-content: center; }
            #isoLib { position: fixed; left: 10px; right: 10px; bottom: 88px; z-index: 70; margin-top: 0 !important; transform: translateY(135%); transition: transform 0.28s ease; box-shadow: 0 -10px 34px rgba(94, 58, 32, 0.22); }
            #isoLib.sheet-open { transform: translateY(0); }
            #isoLibBody { max-height: 40vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
            #isoLibTabs, #isoSpaceTabs, #isoFloorToggles, #isoThemeRow, #isoComboRow { flex-wrap: nowrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
            #isoLibTabs::-webkit-scrollbar, #isoSpaceTabs::-webkit-scrollbar { display: none; }
            #isoLibTabs .iso-space-tab, #isoSpaceTabs .iso-space-tab { white-space: nowrap; flex: 0 0 auto; }
            .iso-space-tab { font-size: 13px; padding: 10px 16px; }
            .iso-theme-btn { font-size: 12px; padding: 9px 14px; }
            .iso-pal { height: 76px; }
            .furn-item { padding: 10px; margin: -10px; }
            .furn-item.iso-dragging .furn-svg { opacity: 0.75; transform: translateY(-9px) scale(1.06); }
            #isoEditView #isoFocusHide button { min-height: 42px; }
            #isoItemSelected { max-width: 72px; overflow: hidden; text-overflow: ellipsis; }
        }`, 'css-mobile');

fs.writeFileSync(FILE, c, 'utf8');
console.log('✓ 全部 ' + applied + ' 处替换完成');
