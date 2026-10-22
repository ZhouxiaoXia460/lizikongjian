// 3.4 窗户等轴测重绘 + 墙面交互补丁（弹性匹配 \r?\n，兼容混合行尾）
// 用法：node _opt2.cjs   （对 index.html 就地修改）
const fs = require('fs');
const FILE = require('path').join(__dirname, 'index.html');
let c = fs.readFileSync(FILE, 'utf8');
let applied = 0;
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function mkRe(oldS, g) { return new RegExp(oldS.split('\n').map(esc).join('\\r?\\n'), g ? 'g' : ''); }
function rep(oldS, newS, label) {
    const re = mkRe(oldS), n = (c.match(mkRe(oldS, true)) || []).length;
    if (n === 0) throw new Error('未找到锚点：' + label);
    if (n > 1) throw new Error('锚点不唯一（' + n + ' 次）：' + label);
    c = c.replace(re, newS.replace(/\$/g, '$$$$'));
    applied++;
}
function repAll(oldS, newS, label) {
    const n = (c.match(mkRe(oldS, true)) || []).length;
    if (n === 0) throw new Error('未找到锚点：' + label);
    c = c.replace(mkRe(oldS, true), newS.replace(/\$/g, '$$$$'));
    applied += n;
}

// ============ A. _pushWalls：固定窗户绘制 → 数据驱动（wins 数组） ============
rep(`// 窗：白窗框 + 主题玻璃 + 斜向高光 + 窗台；夜晚玻璃透暖光 + 光晕；win 型：tall 落地飘窗 / small 小屋圆窗 / std 标准
        const winCfg = opts.win || 'std';
        const winHalf = (winCfg === 'tall' ? 16 : winCfg === 'small' ? 9 : 13);
        const winTop = (winCfg === 'tall' ? 60 : winCfg === 'small' ? 42 : 48);
        const winBot = (winCfg === 'tall' ? 4 : 8);
        const win = function (gx) {
            const w = P(gx, 0);
            const x0 = w[0] - winHalf * S, x1 = w[0] + winHalf * S, yT = w[1] - winTop * S, yB = w[1] - winBot * S;
            push([[x0 - 3 * S, yT - 3 * S], [x1 + 3 * S, yT - 3 * S], [x1 + 3 * S, yB + 3 * S], [x0 - 3 * S, yB + 3 * S]], '#FFFFFF');
            if (night) {
                out.push('<circle cx="' + Math.round((x0 + x1) / 2) + '" cy="' + Math.round((yT + yB) / 2) + '" r="' + Math.round(26 * S + 8) + '" fill="rgba(255, 205, 120, 0.22)"/>');
                out.push('<circle cx="' + Math.round((x0 + x1) / 2) + '" cy="' + Math.round((yT + yB) / 2) + '" r="' + Math.round(16 * S + 5) + '" fill="rgba(255, 214, 140, 0.3)"/>');
            }
            push([[x0, yT], [x1, yT], [x1, yB], [x0, yB]], night ? '#FFDFA0' : (opts.stickers ? '#FBE3F0' : '#DFF3FB'));
            if (T) T(x0, yT, x1, yB);
            out.push('<line x1="' + Math.round(x0 + 4 * S) + '" y1="' + Math.round(yB - 4 * S) + '" x2="' + Math.round(x0 + 13 * S) + '" y2="' + Math.round(yT + 5 * S) + '" stroke="rgba(255,255,255,0.8)" stroke-width="' + Math.max(1.5, 2.5 * S) + '" stroke-linecap="round"/>');
            push([[x0 - 5 * S, yB + 3 * S], [x1 + 5 * S, yB + 3 * S], [x1 + 5 * S, yB + 6 * S], [x0 - 5 * S, yB + 6 * S]], _shade(theme.wallCap, night ? 0.6 : 0.95));
        };
        win(2.2); win(4.6); win(7.4); win(9.8);`,
`// 窗（3.4 重绘）：等角透视平行四边形 + 窗框厚度 + 柔光玻璃；位置来自 wins 数据（强制贴墙），编辑态由 DOM 图层交互
        (opts.wins || []).forEach(function (w) { _pushIsoWin(out, P, S, theme, night, w, opts.tk, T); });`, 'win-block');

// ============ B. 左墙挂画 / 门框：修正为跟随左墙 -0.5 斜率的等角透视 ============
rep(`        // 左墙挂画（白框 + 主题芯）+ 门框
        const a = P(0, 2.2);
        push([[a[0] - 11 * S, a[1] - 44 * S], [a[0] + 3 * S, a[1] - 37 * S], [a[0] + 3 * S, a[1] - 12 * S], [a[0] - 11 * S, a[1] - 19 * S]], '#FFFFFF');
        push([[a[0] - 8 * S, a[1] - 40 * S], [a[0] + 1 * S, a[1] - 35 * S], [a[0] + 1 * S, a[1] - 16 * S], [a[0] - 8 * S, a[1] - 21 * S]], opts.stickers ? '#F9C6D9' : '#FDE3EE');
        const d = P(0, 4.6);
        if (T) T(d[0] - 14 * S, d[1] - 58 * S, d[0] + 8 * S, d[1] + 2 * S);
        out.push('<polygon points="' + Math.round(d[0] - 9 * S) + ',' + Math.round(d[1] - 54 * S) + ' ' + Math.round(d[0] + 5 * S) + ',' + Math.round(d[1] - 47 * S) + ' ' + Math.round(d[0] + 5 * S) + ',' + Math.round(d[1] - 6 * S) + ' ' + Math.round(d[0] - 9 * S) + ',' + Math.round(d[1] - 13 * S) + '" fill="none" stroke="' + _shade(theme.wall, night ? 0.45 : 0.7) + '" stroke-width="' + Math.max(2, 3 * S) + '" stroke-linejoin="round"/>');`,
`        // 左墙挂画（白框 + 主题芯）+ 门框（3.4：修正为跟随左墙 -0.5 斜率的等角透视）
        const a = P(0, 2.2);
        push([[a[0] - 11 * S, a[1] + 5.5 * S - 44 * S], [a[0] + 3 * S, a[1] - 1.5 * S - 44 * S], [a[0] + 3 * S, a[1] - 1.5 * S - 19 * S], [a[0] - 11 * S, a[1] + 5.5 * S - 19 * S]], '#FFFFFF');
        push([[a[0] - 8 * S, a[1] + 4 * S - 40 * S], [a[0], a[1] - 40 * S], [a[0], a[1] - 22 * S], [a[0] - 8 * S, a[1] + 4 * S - 22 * S]], opts.stickers ? '#F9C6D9' : '#FDE3EE');
        const d = P(0, 4.6);
        if (T) T(d[0] - 14 * S, d[1] - 56 * S, d[0] + 8 * S, d[1] + 2 * S);
        out.push('<polygon points="' + Math.round(d[0] - 9 * S) + ',' + Math.round(d[1] - 45 * S) + ' ' + Math.round(d[0] + 5 * S) + ',' + Math.round(d[1] - 52 * S) + ' ' + Math.round(d[0] + 5 * S) + ',' + Math.round(d[1] - 11 * S) + ' ' + Math.round(d[0] - 9 * S) + ',' + Math.round(d[1] - 4 * S) + '" fill="none" stroke="' + _shade(theme.wall, night ? 0.45 : 0.7) + '" stroke-width="' + Math.max(2, 3 * S) + '" stroke-linejoin="round"/>');`, 'painting-door');

// ============ C. 新增等角窗户渲染器（总览 SVG 与编辑器 DOM 共用） ============
rep(`    }

    // —— 地面系统（共用）：深浅交错木板 + 拼缝、瓷砖砖缝明暗、地毯绒面；night 时整体压暗 ——`,
`    }

    // ==================== 3.4 等角窗户组件：透视平行四边形 + 窗框厚度 + 柔光玻璃（总览/编辑共用） ====================
    let _winUid = 0;
    function _isoWinCfg(t) { return t === 'tall' ? { half: 16, top: 60, bot: 4 } : (t === 'small' ? { half: 9, top: 42, bot: 8 } : { half: 13, top: 48, bot: 8 }); }
    function _isoWinGlass(tk, night) {
        if (night) return '#FFDFA0';
        return ({ cozy: '#DFF3FB', beach: '#D6F2EF', apart: '#FDF3DF', cyber: '#FBE3F0' })[tk] || '#DFF3FB';
    }
    // wall: 'right'（后右墙 gy=0，屏幕斜率 +0.5）| 'left'（后左墙 gx=0，斜率 -0.5）；gx = 沿墙坐标；锚点 = 窗底中心在墙面上的点
    function _pushIsoWin(out, P, S, theme, night, w, tk, T) {
        const cfg = _isoWinCfg(w.t);
        const left = w.wall === 'left';
        const m = left ? -0.5 : 0.5;
        const A = left ? P(0, w.gx) : P(w.gx, 0);
        const pt = function (dx, up) { return [A[0] + dx * S, A[1] + m * dx * S - up * S]; };
        const off = function (pts, ox, oy) { return pts.map(function (p) { return [p[0] + ox, p[1] + oy]; }); };
        const poly = function (pts, fill, op, sw) {
            if (T) pts.forEach(function (p) { T(p[0], p[1], p[0], p[1]); });
            out.push('<polygon points="' + pts.map(function (p) { return Math.round(p[0]) + ',' + Math.round(p[1]); }).join(' ') + '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + (sw ? ' stroke="' + fill + '" stroke-width="' + sw + '" stroke-linejoin="round"' : '') + '/>');
        };
        const H = cfg.half, yT = cfg.top, yB = Math.max(2, cfg.bot);
        const fr = 4.5, dep = 2.6;
        const nx = (left ? 1 : -1) * dep * 0.89, ny = dep * 0.45; // 朝房间方向（屏幕系）的厚度偏移
        const cx = A[0], cy = A[1] - (yT + yB) / 2 * S;
        // 夜晚：窗外暖光光晕（画在最底层）
        if (night) {
            out.push('<circle cx="' + Math.round(cx) + '" cy="' + Math.round(cy) + '" r="' + Math.round(26 * S + 8) + '" fill="rgba(255, 205, 120, 0.22)"/>');
            out.push('<circle cx="' + Math.round(cx) + '" cy="' + Math.round(cy) + '" r="' + Math.round(16 * S + 5) + '" fill="rgba(255, 214, 140, 0.3)"/>');
            if (T) T(cx - 42 * S, cy - 42 * S, cx + 42 * S, cy + 42 * S);
        }
        // 外凸窗台：先画厚度暗边，再画顶面
        const sillPts = [pt(-H - fr - 3, yB - fr + 1), pt(H + fr + 3, yB - fr + 1), pt(H + fr + 3, yB - fr - 2.5), pt(-H - fr - 3, yB - fr - 2.5)];
        poly(off(sillPts, nx * 1.6, ny * 1.6), _shade(theme.wallCap, night ? 0.48 : 0.75));
        poly(sillPts, _shade(theme.wallCap, night ? 0.62 : 0.98));
        // 窗框厚度（朝房间探出的一圈侧壁）+ 白色圆润窗框
        const framePts = [pt(-H - fr, yT + fr), pt(H + fr, yT + fr), pt(H + fr, yB - fr), pt(-H - fr, yB - fr)];
        poly(off(framePts, nx, ny), _shade(theme.wallCap, night ? 0.55 : 0.8));
        poly(framePts, '#FFFFFF', null, Math.max(1.5, 2.2 * S));
        // 玻璃：主题柔光色 + 顶部高光渐变（半透明，避免纯白死板色块）
        const uid = 'wgl' + (++_winUid);
        const glass = _isoWinGlass(tk, night);
        out.push('<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,0.55)"/><stop offset="45%" stop-color="rgba(255,255,255,0.08)"/><stop offset="100%" stop-color="rgba(94,58,32,0.10)"/></linearGradient></defs>');
        poly([pt(-H, yT), pt(H, yT), pt(H, yB), pt(-H, yB)], glass, night ? 0.94 : 0.86);
        poly([pt(-H, yT), pt(H, yT), pt(H, yB), pt(-H, yB)], 'url(#' + uid + ')');
        // 顶部内侧暗部（进深）+ 底部内侧反光（柔光）
        poly([pt(-H, yT), pt(H, yT), pt(H, yT - 5), pt(-H, yT - 5)], 'rgba(94, 58, 32, 0.15)');
        poly([pt(-H, yB + 1), pt(H, yB + 1), pt(H, yB + 3.5), pt(-H, yB + 3.5)], 'rgba(255, 255, 255, 0.5)');
        // 斜向高光
        const hl1 = pt(-H + 4, yB + 4), hl2 = pt(-H + 13, yT - 4);
        out.push('<line x1="' + Math.round(hl1[0]) + '" y1="' + Math.round(hl1[1]) + '" x2="' + Math.round(hl2[0]) + '" y2="' + Math.round(hl2[1]) + '" stroke="rgba(255,255,255,0.8)" stroke-width="' + Math.max(1.5, 2.5 * S) + '" stroke-linecap="round"/>');
        // 中梃：竖梃 + 横梃（小屋窗只留竖梃）
        poly([pt(-1, yT), pt(1, yT), pt(1, yB), pt(-1, yB)], '#FFFFFF');
        if (w.t !== 'small') poly([pt(-H, (yT + yB) / 2 + 1), pt(H, (yT + yB) / 2 + 1), pt(H, (yT + yB) / 2 - 1), pt(-H, (yT + yB) / 2 - 1)], '#FFFFFF');
        if (T) T(A[0] - (H + fr + 8) * S, A[1] - (yT + fr + 10) * S, A[0] + (H + fr + 8) * S, A[1] + 4 * S);
    }

    // —— 地面系统（共用）：深浅交错木板 + 拼缝、瓷砖砖缝明暗、地毯绒面；night 时整体压暗 ——`, 'iso-win-renderer');

// ============ D. 两处调用点：总览传 wins 数据；编辑器壳层不画窗（改 DOM 图层） ============
rep(`            _pushWalls(out, track, PP, S, theme, G, { stickers: p.key === 'gaming', night: night, win: sp.win });`,
`            _pushWalls(out, track, PP, S, theme, G, { stickers: p.key === 'gaming', night: night, tk: _spaceThemeFor(p.key, themeKey), wins: _isoWinList(p.key) });`, 'overview-call');

rep(`            _pushWalls(out, null, P, 1, theme, G, { stickers: _spaceTheme(isoSpaceKey) === 'cyber', night: night, win: sp.win });
            _pushFloor(out, null, P, 1, theme, sp, G, night);
        }
        // 网格线：吸附辅助（自由摆放模式隐藏）`,
`            _pushWalls(out, null, P, 1, theme, G, { stickers: _spaceTheme(isoSpaceKey) === 'cyber', night: night, tk: _spaceTheme(isoSpaceKey), wins: null }); // 窗户改由 DOM 图层渲染（可选中/拖动）
            _pushFloor(out, null, P, 1, theme, sp, G, night);
        }
        // 网格线：吸附辅助（自由摆放模式隐藏）`, 'editor-call');

// 截图导出：把当前窗户数据画进导出 SVG
rep(`            _pushWalls(out, null, P, 1, theme, G, { stickers: _spaceTheme(isoSpaceKey) === 'cyber', night: night, win: sp.win });
            _pushFloor(out, null, P, 1, theme, sp, G, night);
            const fA = P(G.cols, 0), fB = P(G.cols, G.rows), fC = P(0, G.rows);`,
`            _pushWalls(out, null, P, 1, theme, G, { stickers: _spaceTheme(isoSpaceKey) === 'cyber', night: night, tk: _spaceTheme(isoSpaceKey), wins: _isoWinList(isoSpaceKey) }); // 导出图含当前窗户位置
            _pushFloor(out, null, P, 1, theme, sp, G, night);
            const fA = P(G.cols, 0), fB = P(G.cols, G.rows), fC = P(0, G.rows);`, 'export-call');

// ============ E. 编辑器：data-theme 标记 + 渲染窗户 DOM 图层 ============
rep(`        world.innerHTML = '<svg id="isoShellSvg" width="' + world.style.width + '" height="' + (world.style.height) + '" style="display:block">' + out.join('') + '</svg>';`,
`        world.setAttribute('data-theme', _spaceTheme(isoSpaceKey)); // 选中态主题色高亮（CSS 按主题取色）
        world.innerHTML = '<svg id="isoShellSvg" width="' + world.style.width + '" height="' + (world.style.height) + '" style="display:block">' + out.join('') + '</svg>';`, 'world-theme');

rep(`        _renderIsoItems();
        _applyIsoTransform();
        if (isoPalsOn()) startIsoPals(); else stopIsoPals();`,
`        _renderIsoWinEls();
        _renderIsoItems();
        _applyIsoTransform();
        if (isoPalsOn()) startIsoPals(); else stopIsoPals();`, 'world-winels');

// ============ F. 家具定义 / 分类：新增三款窗户 ============
rep(`    const FURN_LIB = [
        { cat: 'living'`, `    const FURN_LIB = [
        { cat: 'living'`, 'furnlib-noop-guard');
rep(`        { cat: 'wall', label: '🖼 墙饰', keys: ['wpic', 'wpic2', 'wclock', 'wreath', 'garland', 'wshelf', 'wmirror'] },`,
`        { cat: 'wall', label: '🖼 墙饰', keys: ['wpic', 'wpic2', 'wclock', 'wreath', 'garland', 'wshelf', 'wmirror', 'winStd', 'winTall', 'winSmall'] },`, 'furnlib-wall');

rep(`    const FURN_DEF = {`,
`    const FURN_DEF = {
        // 窗户组件（3.4）：winType = std/tall/small；渲染与交互走窗户专用逻辑，不入 items[]
        winStd: { name: '标准窗', winType: 'std', parts: [] },
        winTall: { name: '落地飘窗', winType: 'tall', parts: [] },
        winSmall: { name: '小屋窗', winType: 'small', parts: [] },`, 'furndef-win');

// ============ G. 家具库缩略图 / 拖拽幽灵：窗户专用渲染 ============
rep(`        document.getElementById('isoLibItems').innerHTML = cat.keys.map(function (k) {
            return '<button class="iso-pal" title="' + FURN_DEF[k].name + '" onpointerdown="isoLibDragStart(event, \\'' + k + '\\')">' + _furnSVGHTML(k, 0.62, undefined, undefined, libTk) + '</button>';
        }).join('');`,
`        document.getElementById('isoLibItems').innerHTML = cat.keys.map(function (k) {
            const d2 = FURN_DEF[k] || {};
            const svg2 = d2.winType ? _isoWinSVGHTML({ wall: 'right', gx: 0, t: d2.winType }, libTk, false, 0.5) : _furnSVGHTML(k, 0.62, undefined, undefined, libTk);
            return '<button class="iso-pal" title="' + d2.name + '" onpointerdown="isoLibDragStart(event, \\'' + k + '\\')">' + svg2 + '</button>';
        }).join('');`, 'lib-render');

rep(`        ghost.innerHTML = _furnSVGHTML(k, 0.9, undefined, undefined, _spaceTheme(isoSpaceKey));`,
`        ghost.innerHTML = def.winType ? _isoWinSVGHTML({ wall: 'right', gx: 0, t: def.winType }, _spaceTheme(isoSpaceKey), false, 0.8) : _furnSVGHTML(k, 0.9, undefined, undefined, _spaceTheme(isoSpaceKey));`, 'lib-ghost');

// ============ H. 从家具库放置窗户（拖拽落位 / 点击拿起后点墙放置） ============
rep(`        isoPushUndo();
        const rawCell = { gx: (drag.cell.fx !== undefined ? drag.cell.fx : drag.cell.gx), gy: (drag.cell.fy !== undefined ? drag.cell.fy : drag.cell.gy) };
        const snapped = _snapDrop(rawCell, drag.k, 0);`,
`        const defNew0 = FURN_DEF[drag.k] || {};
        if (defNew0.winType) { _isoWinAddFromDrop(drag.cell, defNew0.winType); return; } // 窗户：装到墙上（强制贴墙）
        isoPushUndo();
        const rawCell = { gx: (drag.cell.fx !== undefined ? drag.cell.fx : drag.cell.gx), gy: (drag.cell.fy !== undefined ? drag.cell.fy : drag.cell.gy) };
        const snapped = _snapDrop(rawCell, drag.k, 0);`, 'libdrop-win');

rep(`    function _isoTapPlace(ev) {
        const g = _screenToGrid(ev.clientX, ev.clientY);
        isoPushUndo();`,
`    function _isoTapPlace(ev) {
        const g = _screenToGrid(ev.clientX, ev.clientY);
        const defHeld = FURN_DEF[isoHeld.k] || {};
        if (defHeld.winType) { _isoWinAddFromDrop({ gx: g.gx, gy: g.gy }, defHeld.winType); isoHeld = null; const hi0 = document.getElementById('isoHeldHi'); if (hi0) hi0.remove(); return; }
        isoPushUndo();`, 'tapplace-win');

// ============ I. 选中操作栏 / 旋转 / 删除 / 复制：支持窗户 ============
rep(`    function _updateIsoItemBar() {
        const bar = document.getElementById('isoItemBar');
        if (!bar) return;
        const item = isoSelId ? isoState.spaces[isoSpaceKey].items.find(i => i.id === isoSelId) : null;`,
`    function _updateIsoItemBar() {
        const bar = document.getElementById('isoItemBar');
        if (!bar) return;
        const winSel = isoSelId ? _isoWinList(isoSpaceKey).find(x => x.id === isoSelId) : null;
        const smBtn = document.getElementById('isoItemSmaller'), bgBtn = document.getElementById('isoItemBigger');
        if (winSel) {
            document.getElementById('isoItemSelected').textContent = '窗户 · ' + (winSel.wall === 'right' ? '右墙' : '左墙');
            const tgW = document.getElementById('isoItemToggle');
            if (tgW) tgW.classList.add('hidden');
            if (smBtn) smBtn.classList.add('hidden');
            if (bgBtn) bgBtn.classList.add('hidden');
            bar.classList.remove('hidden');
            bar.classList.add('flex');
            return;
        }
        if (smBtn) smBtn.classList.remove('hidden');
        if (bgBtn) bgBtn.classList.remove('hidden');
        const item = isoSelId ? isoState.spaces[isoSpaceKey].items.find(i => i.id === isoSelId) : null;`, 'itembar-win');

rep(`    function isoRotateSelected() {
        const item = isoState.spaces[isoSpaceKey].items.find(i => i.id === isoSelId);
        if (!item) { showToast('先点一件家具选中它'); return; }`,
`    function isoRotateSelected() {
        const winSel = _isoWinList(isoSpaceKey).find(x => x.id === isoSelId);
        if (winSel) {
            isoPushUndo();
            winSel.wall = winSel.wall === 'right' ? 'left' : 'right'; // 旋转 = 换一面墙（自动贴合墙面角度）
            winSel.gx = _isoWinSnapPos({ gx: winSel.gx, gy: winSel.gx }, winSel.wall);
            _isoSave();
            _renderIsoWinEls();
            _updateIsoItemBar();
            showToast('🪟 窗户已换到' + (winSel.wall === 'right' ? '右' : '左') + '墙');
            return;
        }
        const item = isoState.spaces[isoSpaceKey].items.find(i => i.id === isoSelId);
        if (!item) { showToast('先点一件家具选中它'); return; }`, 'rotate-win');

rep(`    function isoRemoveSelected() { if (isoSelId) isoRemoveById(isoSelId); }`,
`    function isoRemoveSelected() {
        if (isoSelId && _isoWinList(isoSpaceKey).some(x => x.id === isoSelId)) { isoRemoveWinById(isoSelId); return; }
        if (isoSelId) isoRemoveById(isoSelId);
    }
    // —— 3.4 窗户：编辑态数据与交互（强制贴墙 + 0.2 网格吸附 + 二阶选中制） ——
    function isoRemoveWinById(id) {
        isoPushUndo();
        isoState.spaces[isoSpaceKey].wins = _isoWinList(isoSpaceKey).filter(x => x.id !== id);
        if (isoSelId === id) isoSelId = null;
        _isoSave();
        _renderIsoWinEls();
        _updateIsoItemBar();
        showToast('🪟 窗户已拆除（Ctrl+Z 可撤销，可在家具库「墙饰」重新添加）');
    }
    function _isoWinDefaults(key) {
        const sp = ISO_SPACES[key];
        return (sp && !sp.outdoor && sp.win) ? [2.2, 4.6, 7.4, 9.8].map(function (gx) { return { wall: 'right', gx: gx, t: sp.win }; }) : [];
    }
    // 老存档无 wins 数据 → 按原默认位置生成（位置与旧版完全一致，数据完全兼容）
    function _isoWinList(key) {
        const sp = ISO_SPACES[key];
        if (!sp || sp.outdoor || !sp.win) return [];
        const st = (isoState && isoState.spaces) ? isoState.spaces[key] : null;
        if (st && !Array.isArray(st.wins)) {
            st.wins = _isoWinDefaults(key).map(function (w) { return { id: 'wn_' + key + '_' + Math.round(w.gx * 10) + '_' + Math.floor(Math.random() * 100000), wall: w.wall, gx: w.gx, t: w.t }; });
        }
        return (st && st.wins) || _isoWinDefaults(key);
    }
    function _isoWinSnapPos(g, wall) {
        let v = wall === 'left' ? g.gy : g.gx;
        v = Math.round(v * 5) / 5; // 0.2 网格步进
        const lim = (wall === 'left' ? ISO_GRID.rows : ISO_GRID.cols) - 0.9;
        v = Math.max(0.9, Math.min(lim, v));
        if (wall === 'left' && v > 3.7 && v < 5.5) v = (v < 4.6) ? 3.7 : 5.5; // 避开左墙门框
        return v;
    }
    function _isoWinSVGHTML(w, themeKey, night, sc) {
        const tk = themeKey || _spaceTheme(isoSpaceKey);
        const theme = ISO_THEMES[tk] || ISO_THEMES.cozy;
        const out = [];
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        const T = function (x0, y0, x1, y1) { minX = Math.min(minX, x0, x1); maxX = Math.max(maxX, x0, x1); minY = Math.min(minY, y0, y1); maxY = Math.max(maxY, y0, y1); };
        _pushIsoWin(out, function () { return [0, 0]; }, 1, theme, night, w, tk, T);
        const k = sc || 1;
        minX = Math.floor(Math.min(minX, -30) - 6); minY = Math.floor(Math.min(minY, -80) - 6);
        const bw = Math.ceil(Math.max(maxX, 26) - minX + 6), bh = Math.ceil(Math.max(maxY, 6) - minY + 6);
        return '<svg width="' + Math.round(bw * k) + '" height="' + Math.round(bh * k) + '" viewBox="' + minX + ' ' + minY + ' ' + bw + ' ' + bh + '" style="margin-left:' + Math.round(minX * k) + 'px;margin-top:' + Math.round(minY * k) + 'px;display:block;overflow:visible" class="win-svg">' + out.join('') + '</svg>';
    }
    function _renderIsoWinEls() {
        const world = document.getElementById('isoWorld');
        if (!world || _isoSpaceOX[isoSpaceKey] === undefined) return;
        world.querySelectorAll('.iso-win-item').forEach(function (el) { el.remove(); });
        const OX = _isoSpaceOX[isoSpaceKey], OY = _isoSpaceOY[isoSpaceKey];
        const tk = _spaceTheme(isoSpaceKey), night = !!isoState.night;
        _isoWinList(isoSpaceKey).forEach(function (w) {
            const el = document.createElement('div');
            el.className = 'iso-win-item' + (w.id === isoSelId ? ' iso-selected' : '');
            el.dataset.id = w.id;
            el.style.left = (OX + (w.wall === 'left' ? -w.gx : w.gx) * 32) + 'px';
            el.style.top = (OY + w.gx * 16) + 'px';
            el.style.zIndex = 2 + Math.round(w.gx);
            el.innerHTML = _isoWinSVGHTML(w, tk, night, 1);
            world.appendChild(el);
        });
    }
    function _isoWinDragStart(el, ev) {
        const w = _isoWinList(isoSpaceKey).find(x => x.id === el.dataset.id);
        if (!w) return;
        isoWinDrag = { id: w.id, el: el, w: w, sx: ev.clientX, sy: ev.clientY, moved: false };
        el.classList.add('iso-dragging');
    }
    function _isoWinMove(ev) {
        if (!isoWinDrag) return;
        if (Math.abs(ev.clientX - isoWinDrag.sx) > 4 || Math.abs(ev.clientY - isoWinDrag.sy) > 4) isoWinDrag.moved = true;
        if (!isoWinDrag.moved) return;
        const g = _screenToGrid(ev.clientX, ev.clientY);
        const wall = isoWinDrag.w.wall;
        const v = _isoWinSnapPos(g, wall);
        isoWinDrag.el.style.left = (_isoSpaceOX[isoSpaceKey] + (wall === 'left' ? -v : v) * 32) + 'px';
        isoWinDrag.el.style.top = (_isoSpaceOY[isoSpaceKey] + v * 16) + 'px';
    }
    function _isoWinDrop(ev) {
        if (!isoWinDrag) return;
        const d = isoWinDrag;
        isoWinDrag = null;
        d.el.classList.remove('iso-dragging');
        if (d.moved) {
            isoPushUndo();
            d.w.gx = _isoWinSnapPos(_screenToGrid(ev.clientX, ev.clientY), d.w.wall);
            _isoSave();
            _renderIsoWinEls();
            _updateIsoItemBar();
            showToast('🪟 窗户已贴合墙面（0.2 网格吸附）');
        } else {
            isoSelId = d.id;
            _renderIsoWinEls();
            _updateIsoItemBar();
        }
    }
    function _isoWinAddFromDrop(cell, type) {
        isoPushUndo();
        const g = { gx: (cell.fx !== undefined ? cell.fx : cell.gx), gy: (cell.fy !== undefined ? cell.fy : cell.gy) };
        const wall = (g.gy < g.gx) ? 'right' : 'left'; // 离哪面墙近装哪面
        const list = _isoWinList(isoSpaceKey);
        let v = _isoWinSnapPos(g, wall);
        const offs = [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2, -2, 2.4, -2.4, 2.8, -2.8, 3.2, -3.2];
        for (let i = 0; i < offs.length; i++) {
            const cand = Math.max(0.9, Math.min((wall === 'left' ? ISO_GRID.rows : ISO_GRID.cols) - 0.9, Math.round((v + offs[i]) * 5) / 5));
            if (!list.some(function (x) { return x.wall === wall && Math.abs(x.gx - cand) < 0.55; })) { v = cand; break; }
        }
        const nw = { id: 'wn_' + Date.now() + '_' + Math.floor(Math.random() * 100000), wall: wall, gx: v, t: type };
        list.push(nw);
        isoSelId = nw.id;
        _isoSave();
        _renderIsoWinEls();
        _updateIsoItemBar();
        showToast('🪟 窗户已装到' + (wall === 'right' ? '右' : '左') + '墙（选中后可沿墙拖动 / 🔄 换墙）');
    }
    function _openIsoWinCtx(x, y, id) {
        _closeIsoCtx();
        const w = _isoWinList(isoSpaceKey).find(v => v.id === id);
        if (!w) return;
        isoSelId = id;
        _renderIsoWinEls();
        _updateIsoItemBar();
        const menu = document.createElement('div');
        menu.className = 'iso-ctx-menu';
        menu.innerHTML = '<button onclick="isoCtxAction(\\'rotate\\',\\'' + id + '\\')">🔄 换一面墙</button><button class="danger" onclick="isoCtxAction(\\'remove\\',\\'' + id + '\\')">🗑 拆除</button>';
        document.body.appendChild(menu);
        const mw = menu.offsetWidth, mh = menu.offsetHeight;
        menu.style.left = Math.min(x, window.innerWidth - mw - 8) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - mh - 8) + 'px';
        isoCtxEl = menu;
        setTimeout(function () { document.addEventListener('pointerdown', _isoCtxOutside, true); }, 0);
    }`, 'remove-win-block');

rep(`    function isoCopySelected() {
        const item = isoState.spaces[isoSpaceKey].items.find(i => i.id === isoSelId);
        if (!item) { showToast('先点一件家具选中它'); return; }`,
`    function isoCopySelected() {
        const winSrc = _isoWinList(isoSpaceKey).find(x => x.id === isoSelId);
        if (winSrc) {
            isoPushUndo();
            const clone = JSON.parse(JSON.stringify(winSrc));
            clone.id = 'wn_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
            const list2 = _isoWinList(isoSpaceKey);
            const lim2 = (winSrc.wall === 'left' ? ISO_GRID.rows : ISO_GRID.cols) - 0.9;
            const offs2 = [0.6, -0.6, 1, -1, 1.4, -1.4, 1.8, -1.8, 2.2, -2.2];
            for (let i = 0; i < offs2.length; i++) {
                const cand = Math.max(0.9, Math.min(lim2, Math.round((winSrc.gx + offs2[i]) * 5) / 5));
                if (!list2.some(x => Math.abs(x.gx - cand) < 0.55)) { clone.gx = cand; break; }
            }
            list2.push(clone);
            isoSelId = clone.id;
            _isoSave();
            _renderIsoWinEls();
            _updateIsoItemBar();
            showToast('📋 已复制一扇窗');
            return;
        }
        const item = isoState.spaces[isoSpaceKey].items.find(i => i.id === isoSelId);
        if (!item) { showToast('先点一件家具选中它'); return; }`, 'copy-win');

rep(`        if (act === 'remove') { isoRemoveById(id); return; }`,
`        if (act === 'remove') { isoRemoveSelected(); return; } // 兼容窗户（统一走 isoRemoveSelected 分支）`, 'ctx-remove');

// ============ J. 指针事件接线：窗户的二阶选中 / 拖拽 / 右键 ============
rep(`            const itemEl = ev.target.closest ? ev.target.closest('.furn-item') : null;`,
`            const itemEl = ev.target.closest ? ev.target.closest('.furn-item') : null;
            const winEl = ev.target.closest ? ev.target.closest('.iso-win-item') : null;`, 'pd-winEl');

rep(`            if (itemEl && isoLastPointerType !== 'mouse') {
                isoHold = { id: itemEl.dataset.id, x: ev.clientX, y: ev.clientY };`,
`            if ((itemEl || winEl) && isoLastPointerType !== 'mouse') {
                isoHold = { id: (winEl || itemEl).dataset.id, x: ev.clientX, y: ev.clientY, win: !!winEl };`, 'pd-hold');

rep(`                    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
                    _openIsoCtx(h.x, h.y, h.id, true);`,
`                    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
                    if (h.win) { isoSelId = h.id; _renderIsoWinEls(); _updateIsoItemBar(); return; } // 窗户长按：选中并弹操作栏
                    _openIsoCtx(h.x, h.y, h.id, true);`, 'pd-hold-win');

rep(`            if (isoHeld) { _isoTapPlace(ev); return; } // 手持家具：点房间即放置
            if (itemEl) {`,
`            if (isoHeld) { _isoTapPlace(ev); return; } // 手持家具：点房间即放置
            if (winEl) {
                // —— 窗户同样走二阶选中制：未选中单击 = 选中；已选中才可拖动 ——
                if (winEl.dataset.id !== isoSelId) {
                    isoPick = { id: winEl.dataset.id, sx: ev.clientX, sy: ev.clientY, px: isoPan.x, py: isoPan.y, moved: false, win: true };
                    return;
                }
                _isoWinDragStart(winEl, ev);
                return;
            }
            if (itemEl) {`, 'pd-route');

rep(`        let isoPick = null; // 二阶选中：未选中家具上的按下（松手选中 / 滑动转平移）`,
`        let isoPick = null; // 二阶选中：未选中家具上的按下（松手选中 / 滑动转平移）
        let isoWinDrag = null; // 窗户拖拽（沿墙移动）`, 'pd-decl');

rep(`            if (activePtrs.size === 2 && !isoDrag && !isoHeld && !isoLibDrag) {`,
`            if (activePtrs.size === 2 && !isoDrag && !isoHeld && !isoLibDrag && !isoWinDrag) {`, 'pd-pinch');

rep(`            if (isoDrag) { _isoItemMove(ev); return; }
            if (isoLibDrag) { _isoLibMove(ev); return; }
            if (isoPick) {`,
`            if (isoDrag) { _isoItemMove(ev); return; }
            if (isoWinDrag) { _isoWinMove(ev); return; }
            if (isoLibDrag) { _isoLibMove(ev); return; }
            if (isoPick) {`, 'pm-win');

rep(`            if (isoPick) {
                if (!isoPick.moved && isoPick.id !== isoSelId) { isoSelId = isoPick.id; _renderIsoItems(); _updateIsoItemBar(); }
                isoPick = null;
                return;
            }`,
`            if (isoPick) {
                if (!isoPick.moved && isoPick.id !== isoSelId) {
                    isoSelId = isoPick.id;
                    _renderIsoItems(); _renderIsoWinEls(); // 两类图层都刷新，保证旧选中态清除
                    _updateIsoItemBar();
                }
                isoPick = null;
                return;
            }`, 'up-pick');

rep(`            if (isoPanDrag) { isoPanDrag = null; vp.classList.remove('iso-panning'); _isoSave(); return; }
            if (isoDrag) { _isoItemDrop(ev); return; }`,
`            if (isoPanDrag) { isoPanDrag = null; vp.classList.remove('iso-panning'); _isoSave(); return; }
            if (isoWinDrag) { _isoWinDrop(ev); return; }
            if (isoDrag) { _isoItemDrop(ev); return; }`, 'up-win');

rep(`            const el = e.target.closest ? e.target.closest('.furn-item') : null;
            // 触屏长按不弹菜单；鼠标右键弹「旋转/开关/复制/收起」菜单
            if (el && isoLastPointerType === 'mouse') _openIsoCtx(e.clientX, e.clientY, el.dataset.id);`,
`            const wEl2 = e.target.closest ? e.target.closest('.iso-win-item') : null;
            if (wEl2 && isoLastPointerType === 'mouse') { _openIsoWinCtx(e.clientX, e.clientY, wEl2.dataset.id); return; }
            const el = e.target.closest ? e.target.closest('.furn-item') : null;
            // 触屏长按不弹菜单；鼠标右键弹「旋转/开关/复制/收起」菜单
            if (el && isoLastPointerType === 'mouse') _openIsoCtx(e.clientX, e.clientY, el.dataset.id);`, 'ctxmenu-win');

// ============ K. 存档兼容：载入/撤销后补齐 wins + 刷新窗户图层 ============
repAll(`Object.keys(ISO_SPACES).forEach(k => { if (!isoState.spaces[k] || !Array.isArray(isoState.spaces[k].items)) isoState.spaces[k] = { items: [] }; });`,
`Object.keys(ISO_SPACES).forEach(k => { if (!isoState.spaces[k] || !Array.isArray(isoState.spaces[k].items)) isoState.spaces[k] = { items: [] }; });
            Object.keys(ISO_SPACES).forEach(k => { if (ISO_SPACES[k] && !ISO_SPACES[k].outdoor && ISO_SPACES[k].win) _isoWinList(k); }); // 老存档补齐窗户数据（位置与旧版一致）`, 'wins-normalize');

rep(`            isoSelId = null;
            _isoSave();
            _renderIsoItems();
            _updateIsoItemBar();
            if (!isoEditOpen) _renderIsoHouse();`,
`            isoSelId = null;
            _isoSave();
            _renderIsoWinEls();
            _renderIsoItems();
            _updateIsoItemBar();
            if (!isoEditOpen) _renderIsoHouse();`, 'undo-winels');

// ============ L. 操作栏缩放按钮加 id（窗户选中时隐藏） ============
rep(`                        <button onclick="isoScaleSelected(-1)" class="iso-act-btn" title="缩小一点">➖</button>
                        <button onclick="isoScaleSelected(1)" class="iso-act-btn" title="放大一点">➕</button>`,
`                        <button id="isoItemSmaller" onclick="isoScaleSelected(-1)" class="iso-act-btn" title="缩小一点">➖</button>
                        <button id="isoItemBigger" onclick="isoScaleSelected(1)" class="iso-act-btn" title="放大一点">➕</button>`, 'bar-btn-ids');

// ============ 校验 ============
['function _pushIsoWin', 'function _isoWinList', 'function _renderIsoWinEls', 'function _isoWinAddFromDrop', 'function _openIsoWinCtx'].forEach(function (f) {
    if ((c.match(new RegExp(esc(f), 'g')) || []).length !== 1) throw new Error('完整性校验失败：' + f);
});
fs.writeFileSync(FILE, c, 'utf8');
console.log('✓ 3.4 全部 ' + applied + ' 处替换完成');
