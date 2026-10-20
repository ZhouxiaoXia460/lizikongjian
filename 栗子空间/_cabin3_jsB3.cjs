// 小屋 3.0 JS 补丁 B3：编辑器世界 + 交互 + 方案行 + 导出 + 样板间
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let n = 0;
const CRLF = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
function rep(oldStr, newStr, tag) {
    oldStr = CRLF(oldStr); newStr = CRLF(newStr);
    if (!html.includes(oldStr)) { console.error('✗ 未找到: ' + tag); process.exit(1); }
    if (html.split(oldStr).length > 2) { console.error('✗ 不唯一: ' + tag); process.exit(1); }
    html = html.replace(oldStr, newStr);
    n++; console.log('✓ ' + tag);
}
function cut(startMarker, endMarker, newMid, tag) {
    startMarker = CRLF(startMarker); endMarker = CRLF(endMarker);
    const i = html.indexOf(startMarker);
    if (i < 0) { console.error('✗ cut 起点未找到: ' + tag); process.exit(1); }
    const j = html.indexOf(endMarker, i + startMarker.length);
    if (j < 0) { console.error('✗ cut 终点未找到: ' + tag); process.exit(1); }
    html = html.slice(0, i) + CRLF(newMid) + html.slice(j);
    n++; console.log('✓ ' + tag);
}

// ============ 1. _buildIsoWorld：户外 / 窗型 / 阳台 / 光影罩层 / 视口底色 ============
rep(
`    function _buildIsoWorld() {
        const world = document.getElementById('isoWorld');
        if (!world) return;
        const theme = ISO_THEMES[_spaceTheme(isoSpaceKey)] || ISO_THEMES.beach;
        const sp = ISO_SPACES.find(s => s.key === isoSpaceKey);
        const G = ISO_GRID;
        const night = !!isoState.night;
        const OX = G.rows * 32, OY = G.wallH + 30;
        _isoSpaceOX[isoSpaceKey] = OX; _isoSpaceOY[isoSpaceKey] = OY;
        world.style.width = (G.rows * 32 + G.cols * 32 + 120) + 'px';
        world.style.height = (G.wallH + 30 + (G.cols + G.rows) * 16 + 150) + 'px';
        const out = [];
        const P = function (gx, gy) { return [OX + (gx - gy) * 32, OY + (gx + gy) * 16]; };
        const poly = function (pts, fill, opacity) { out.push('<polygon points="' + pts.map(function (p) { return Math.round(p[0]) + ',' + Math.round(p[1]); }).join(' ') + '" fill="' + fill + '"' + (opacity ? ' opacity="' + opacity + '"' : '') + ' stroke="' + fill + '" stroke-width="2" stroke-linejoin="round"/>'); };
        _pushWalls(out, null, P, 1, theme, G, { stickers: _spaceTheme(isoSpaceKey) === 'cyber', night: night });
        _pushFloor(out, null, P, 1, theme, sp, G, night);
        // 网格线：极低透明度，仅作拖拽对齐辅助
        const gridLine = night ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 116, 86, 0.07)';
        for (let gy = 0; gy < G.rows; gy++) for (let gx = 0; gx < G.cols; gx++) {
            const p = P(gx, gy);
            out.push('<polygon points="' + p[0] + ',' + p[1] + ' ' + (p[0] + 32) + ',' + (p[1] + 16) + ' ' + p[0] + ',' + (p[1] + 32) + ' ' + (p[0] - 32) + ',' + (p[1] + 16) + '" fill="none" stroke="' + gridLine + '" stroke-width="1"/>');
        }
        _pushPlatformSides(out, P, 1, theme, G, night, 14);
        (sp.dividers || []).forEach(function (dx) {
            const p0 = P(dx, 0), p1 = P(dx, G.rows);
            const H = 54;
            poly([[p0[0], p0[1] - H], [p1[0], p1[1] - H], [p1[0], p1[1] + 2], [p0[0], p0[1] + 2]], theme.wallShade);
        });
        sp.zones.forEach(function (z) {
            const p = P(z.c0 + (z.c1 - z.c0 + 1) / 2, z.r0 + 0.9);
            out.push('<text x="' + Math.round(p[0]) + '" y="' + Math.round(p[1] - 46) + '" font-size="13" font-weight="600" fill="' + (night ? '#F5E6C8' : '#85532E') + '" text-anchor="middle">' + z.name + '</text>');
        });
        const H2 = 22;
        const a1 = P(G.cols, 0), a2 = P(G.cols, G.rows);
        poly([[a1[0], a1[1] - H2], [a2[0], a2[1] - H2], [a2[0], a2[1]], [a1[0], a1[1]]], theme.frontWall, null);
        const b1 = P(0, G.rows), b2 = P(G.cols, G.rows);
        poly([[b1[0], b1[1] - H2], [b2[0], b2[1] - H2], [b2[0], b2[1]], [b1[0], b1[1]]], theme.frontWall, null);
        world.innerHTML = '<svg id="isoShellSvg" width="' + world.style.width + '" height="' + (world.style.height) + '" style="display:block">' + out.join('') + '</svg>';
        const vpEl = document.getElementById('isoViewport');
        if (vpEl) {
            // 画布全天保持明亮奶白（App 深色模式也不压暗小屋）；夜晚模式除外
            vpEl.style.background = night ? 'linear-gradient(180deg, #2A2E55 0%, #3A4070 100%)' : '';
        }
        _renderIsoItems();
        _applyIsoTransform();
        if (isoPalsOn()) startIsoPals(); else stopIsoPals();
    }`,
`    function _buildIsoWorld() {
        const world = document.getElementById('isoWorld');
        if (!world) return;
        const theme = ISO_THEMES[_spaceTheme(isoSpaceKey)] || ISO_THEMES.cozy;
        const sp = ISO_SPACES[isoSpaceKey] || ISO_SPACES.f1;
        const G = ISO_GRID;
        const night = !!isoState.night;
        const outdoor = !!sp.outdoor;
        const OX = G.rows * 32, OY = G.wallH + 30;
        _isoSpaceOX[isoSpaceKey] = OX; _isoSpaceOY[isoSpaceKey] = OY;
        world.style.width = (G.rows * 32 + G.cols * 32 + 120) + 'px';
        world.style.height = (G.wallH + 30 + (G.cols + G.rows) * 16 + (sp.balcony ? 215 : 150)) + 'px';
        const out = [];
        const P = function (gx, gy) { return [OX + (gx - gy) * 32, OY + (gx + gy) * 16]; };
        const poly = function (pts, fill, opacity) { out.push('<polygon points="' + pts.map(function (p) { return Math.round(p[0]) + ',' + Math.round(p[1]); }).join(' ') + '" fill="' + fill + '"' + (opacity ? ' opacity="' + opacity + '"' : '') + ' stroke="' + fill + '" stroke-width="2" stroke-linejoin="round"/>'); };
        if (outdoor) {
            _pushFloor(out, null, P, 1, theme, sp, G, night);
            _pushPlatformSides(out, P, 1, { wood: theme.grass, woodLine: theme.grassLine }, G, night, 12);
            const gLay = _isoHouse().layout.find(function (s) { return s.floors.indexOf(isoSpaceKey) >= 0; });
            _pushFence(out, P, 1, theme, G, night, (gLay && gLay.dx > 0) ? 'left' : 'right');
        } else {
            _pushWalls(out, null, P, 1, theme, G, { stickers: _spaceTheme(isoSpaceKey) === 'cyber', night: night, win: sp.win });
            _pushFloor(out, null, P, 1, theme, sp, G, night);
        }
        // 网格线：吸附辅助（自由摆放模式隐藏）
        if (!isoState.freePlace) {
            const gridLine = night ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 116, 86, 0.07)';
            for (let gy = 0; gy < G.rows; gy++) for (let gx = 0; gx < G.cols; gx++) {
                const p = P(gx, gy);
                out.push('<polygon points="' + p[0] + ',' + p[1] + ' ' + (p[0] + 32) + ',' + (p[1] + 16) + ' ' + p[0] + ',' + (p[1] + 32) + ' ' + (p[0] - 32) + ',' + (p[1] + 16) + '" fill="none" stroke="' + gridLine + '" stroke-width="1"/>');
            }
        }
        if (!outdoor) _pushPlatformSides(out, P, 1, theme, G, night, 14);
        if (sp.balcony && !outdoor) _pushBalcony(out, P, 1, theme, G, night);
        if (!outdoor) {
            (sp.dividers || []).forEach(function (dx) {
                const p0 = P(dx, 0), p1 = P(dx, G.rows);
                const H = 54;
                poly([[p0[0], p0[1] - H], [p1[0], p1[1] - H], [p1[0], p1[1] + 2], [p0[0], p0[1] + 2]], theme.wallShade);
            });
        }
        sp.zones.forEach(function (z) {
            const p = P(z.c0 + (z.c1 - z.c0 + 1) / 2, z.r0 + 0.9);
            out.push('<text x="' + Math.round(p[0]) + '" y="' + Math.round(p[1] - 46) + '" font-size="13" font-weight="600" fill="' + (night ? '#F5E6C8' : '#85532E') + '" text-anchor="middle">' + z.name + '</text>');
        });
        if (!outdoor) {
            const H2 = 22;
            const a1 = P(G.cols, 0), a2 = P(G.cols, G.rows);
            poly([[a1[0], a1[1] - H2], [a2[0], a2[1] - H2], [a2[0], a2[1]], [a1[0], a1[1]]], theme.frontWall, null);
            const b1 = P(0, G.rows), b2 = P(G.cols, G.rows);
            poly([[b1[0], b1[1] - H2], [b2[0], b2[1] - H2], [b2[0], b2[1]], [b1[0], b1[1]]], theme.frontWall, null);
        }
        // 光影罩层（盖在最上层，不挡交互）
        out.push(_lightSvgRects(null, 0, 0, parseInt(world.style.width), parseInt(world.style.height)));
        world.innerHTML = '<svg id="isoShellSvg" width="' + world.style.width + '" height="' + (world.style.height) + '" style="display:block">' + out.join('') + '</svg>';
        const vpEl = document.getElementById('isoViewport');
        if (vpEl) {
            // 画布全天保持明亮（App 深色模式也不压暗小屋）；底色随光影微调
            vpEl.style.background = _lightBgCss();
        }
        _renderIsoItems();
        _applyIsoTransform();
        if (isoPalsOn()) startIsoPals(); else stopIsoPals();
    }`,
'_buildIsoWorld 3.0');

// ============ 2. 单品缩放：渲染与操作 ============
rep(
`        const svg = _furnSVGHTML(it.k, scale || 1, undefined, undefined, _spaceTheme(spaceKey || isoSpaceKey), it.rot, it);`,
`        const svg = _furnSVGHTML(it.k, (it.s || 1) * (scale || 1), undefined, undefined, _spaceTheme(spaceKey || isoSpaceKey), it.rot, it);`,
'_furnItemEl 单品缩放');

rep(
`    function isoRotateSelected() {`,
`    function isoScaleSelected(dir) {
        const item = isoState.spaces[isoSpaceKey].items.find(i => i.id === isoSelId);
        if (!item) { showToast('先点一件家具选中它'); return; }
        isoPushUndo();
        const cur = item.s || 1;
        item.s = Math.round(Math.max(0.55, Math.min(1.7, cur + dir * 0.15)) * 100) / 100;
        _isoSave();
        _renderIsoItems();
        showToast('📏 「' + ((FURN_DEF[item.k] || {}).name || '') + '」大小 ' + Math.round(item.s * 100) + '%');
    }
    function isoRotateSelected() {`,
'isoScaleSelected 新增');

// ============ 3. 回收模式 / 全部回收 / 吸附开关 / 去花园 ============
rep(
`    let isoLibOpen = true;
    let isoLibCat = 'living';`,
`    let isoLibOpen = true;
    let isoLibCat = 'living';
    let isoRecycleMode = false;
    function isoRecycleToggle() {
        isoRecycleMode = !isoRecycleMode;
        const b = document.getElementById('isoRecycleBtn');
        if (b) b.classList.toggle('on', isoRecycleMode);
        const vp = document.getElementById('isoViewport');
        if (vp) vp.classList.toggle('iso-recycle', isoRecycleMode);
        if (isoRecycleMode) { isoSelId = null; _updateIsoItemBar(); }
        showToast(isoRecycleMode ? '♻️ 回收模式：点击家具直接收回（Ctrl+Z 可撤销）' : '♻️ 已退出回收模式');
    }
    function isoAllRecycle() { clearIsoSpace(); }
    function isoToggleSnap() {
        isoState.freePlace = !isoState.freePlace;
        _isoSave();
        const b = document.getElementById('isoSnapBtn');
        if (b) { b.classList.toggle('on', !isoState.freePlace); b.innerHTML = isoState.freePlace ? '✋ 自由' : '🧲 吸附'; }
        if (isoEditOpen) _buildIsoWorld();
        showToast(isoState.freePlace ? '✋ 自由摆放：网格与磁吸已关闭，随意摆！' : '🧲 吸附辅助已开启：网格对齐 + 贴墙磁吸');
    }
    function isoGotoGarden() {
        const ks = _isoHouseSpaces();
        if (ks.indexOf('garden') >= 0) { selectIsoSpace('garden'); showToast('🌿 欢迎来到我的花园'); }
        else { openIsoHouses(); showToast('当前户型没有花园，换「带院小屋」或「LOFT 复式」就有啦'); }
    }`,
'回收/吸附/花园交互');

rep(
`    function _isoItemDrop(ev) {
        if (!isoDrag) return;
        const d = isoDrag;
        isoDrag = null;
        d.el.classList.remove('iso-dragging');
        const hi = document.getElementById('isoCellHi');
        if (hi) hi.remove();
        const vp = document.getElementById('isoViewport').getBoundingClientRect();
        const inside = ev.clientX >= vp.left && ev.clientX <= vp.right && ev.clientY >= vp.top && ev.clientY <= vp.bottom;
        if (!inside) { isoRemoveById(d.id); return; }
        if (d.moved && d.cell) {
            isoPushUndo();
            const rawCell = { gx: (d.cell.fx !== undefined ? d.cell.fx : d.cell.gx), gy: (d.cell.fy !== undefined ? d.cell.fy : d.cell.gy) };
            const snapped = _snapDrop(rawCell, d.item.k, d.item.rot);
            d.item.gx = snapped.gx; d.item.gy = snapped.gy;
            _isoSave();
        }
        else { isoSelId = d.id; }
        _renderIsoItems();
        _updateIsoItemBar();
    }`,
`    function _isoItemDrop(ev) {
        if (!isoDrag) return;
        const d = isoDrag;
        isoDrag = null;
        d.el.classList.remove('iso-dragging');
        const hi = document.getElementById('isoCellHi');
        if (hi) hi.remove();
        const vp = document.getElementById('isoViewport').getBoundingClientRect();
        const inside = ev.clientX >= vp.left && ev.clientX <= vp.right && ev.clientY >= vp.top && ev.clientY <= vp.bottom;
        if (!inside) { isoRemoveById(d.id); return; }
        if (d.moved && d.cell) {
            isoPushUndo();
            const rawCell = { gx: (d.cell.fx !== undefined ? d.cell.fx : d.cell.gx), gy: (d.cell.fy !== undefined ? d.cell.fy : d.cell.gy) };
            const snapped = _snapDrop(rawCell, d.item.k, d.item.rot);
            d.item.gx = snapped.gx; d.item.gy = snapped.gy;
            _isoSave();
        }
        else {
            if (isoRecycleMode) { isoRemoveById(d.id); return; }
            isoSelId = d.id;
        }
        _renderIsoItems();
        _updateIsoItemBar();
    }`,
'_isoItemDrop 回收模式');

// ============ 4. 自由摆放：吸附与高亮 ============
rep(
`    function _snapDrop(g, k, rot) {
        const fe = _furnHalfExtents(k, rot);
        const cols = ISO_GRID.cols, rows = ISO_GRID.rows;
        let u = g.gx + 0.5, v = g.gy + 0.5; // 期望中心（连续网格坐标）
        const items = isoState.spaces[isoSpaceKey].items;`,
`    function _snapDrop(g, k, rot) {
        const fe = _furnHalfExtents(k, rot);
        const cols = ISO_GRID.cols, rows = ISO_GRID.rows;
        let u = g.gx + 0.5, v = g.gy + 0.5; // 期望中心（连续网格坐标）
        if (isoState.freePlace) {
            // 自由摆放：只限制在房间内，不吸网格不吸墙
            u = Math.max(fe.hx, Math.min(cols - fe.hx, u));
            v = Math.max(fe.hy, Math.min(rows - fe.hy, v));
            return { gx: Math.round((u - 0.5) * 100) / 100, gy: Math.round((v - 0.5) * 100) / 100 };
        }
        const items = isoState.spaces[isoSpaceKey].items;`,
'_snapDrop 自由摆放');

rep(
`            const p = _isoPos(gx, gy);
            hi.style.display = 'block';
            hi.style.left = (p.x - 32) + 'px';`,
`            const p = _isoPos(gx, gy);
            hi.style.display = isoState.freePlace ? 'none' : 'block';
            hi.style.left = (p.x - 32) + 'px';`,
'_isoLibMove 高亮条件');

rep(
`            const p2 = _isoPos(gx, gy);
            hi.style.display = 'block';
            hi.style.left = (p2.x - 32) + 'px';`,
`            const p2 = _isoPos(gx, gy);
            hi.style.display = isoState.freePlace ? 'none' : 'block';
            hi.style.left = (p2.x - 32) + 'px';`,
'_isoItemMove 高亮条件');

// ============ 5. 缩放滑杆 + 视图变换联动 ============
rep(
`    function _applyIsoTransform() {
        const world = document.getElementById('isoWorld');
        if (world) world.style.transform = 'translate(' + isoPan.x + 'px,' + isoPan.y + 'px) scale(' + isoPan.zoom + ')';
    }`,
`    function _applyIsoTransform() {
        const world = document.getElementById('isoWorld');
        if (world) world.style.transform = 'translate(' + isoPan.x + 'px,' + isoPan.y + 'px) scale(' + isoPan.zoom + ')';
        const zr = document.getElementById('isoZoomRange');
        if (zr) zr.value = String(Math.round(isoPan.zoom * 100) / 100);
    }
    function isoZoomSlider(v) {
        v = Math.max(0.5, Math.min(2.2, parseFloat(v) || 1));
        const vp = document.getElementById('isoViewport');
        if (!vp) return;
        const r = vp.getBoundingClientRect();
        if (Math.abs(v - isoPan.zoom) < 0.005) return;
        _isoZoomAt(r.left + r.width / 2, r.top + r.height / 2, v / isoPan.zoom);
    }`,
'缩放滑杆联动');

// ============ 6. toggleIsoNight：双按钮 + 光影底色 ============
rep(
`    // —— 昼夜切换 ——
    function toggleIsoNight() {
        isoState.night = !isoState.night;
        _isoSave();
        const b = document.getElementById('isoNightBtn');
        if (b) b.innerHTML = isoState.night ? '☀️ 白天' : '🌙 夜晚';
        if (isoEditOpen) _buildIsoWorld(); else _renderIsoHouse();
        showToast(isoState.night ? '🌙 夜晚模式：灯都亮起来啦' : '☀️ 白天模式');
    }`,
`    // —— 昼夜切换（光影开关） ——
    function toggleIsoNight() {
        isoState.night = !isoState.night;
        _isoSave();
        _updateIsoNightBtns();
        if (isoEditOpen) _buildIsoWorld(); else _renderIsoHouse();
        showToast(isoState.night ? '🌙 夜晚模式：灯都亮起来啦' : '☀️ 白天模式');
    }
    function _updateIsoNightBtns() {
        const b = document.getElementById('isoNightBtn');
        if (b) b.innerHTML = isoState.night ? '☀️ 白天' : '🌙 夜晚';
        const b2 = document.getElementById('isoNightBtn2');
        if (b2) b2.innerHTML = isoState.night ? '🌙' : '☀️';
    }`,
'toggleIsoNight 双按钮');

// ============ 7. 移除进度条 / 新手任务 / 成就（无压力纯布置） ============
cut(
'    // —— 布置进度条 ——',
'    // —— 组合预设：一键摆一套 ——',
'    ',
'移除进度/任务/成就');

// ============ 8. _afterIsoChange 精简 ============
rep(
`    // 每次布置变化后的联动刷新：进度条 / 新手任务 / 成就检查
    function _afterIsoChange() {
        if (!isoState || !isoState.spaces) return;
        _updateIsoProgress();
        _renderIsoTasks();
        _checkIsoAwards(true);
    }`,
`    // 每次布置变化后的联动刷新（保留钩子位，当前无强制任务/成就，纯自由布置）
    function _afterIsoChange() { }`,
'_afterIsoChange 精简');

fs.writeFileSync(file, html, 'utf8');
console.log('JS 补丁 B3 完成，共 ' + n + ' 处 ✓');
