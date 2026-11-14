// 小屋 3.0 JS 补丁 B：渲染系统（光影/栅栏/阳台/总览通用化/编辑器）
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
// 用标记切片替换：把 [startMarker, endMarker) 区间换成 newMid（自动补行尾）
function cut(startMarker, endMarker, newMid, tag) {
    startMarker = CRLF(startMarker); endMarker = CRLF(endMarker);
    const i = html.indexOf(startMarker);
    if (i < 0) { console.error('✗ cut 起点未找到: ' + tag); process.exit(1); }
    const j = html.indexOf(endMarker, i + startMarker.length);
    if (j < 0) { console.error('✗ cut 终点未找到: ' + tag); process.exit(1); }
    html = html.slice(0, i) + CRLF(newMid) + html.slice(j);
    n++; console.log('✓ ' + tag);
}

// ============ 1. _loadIsoState：对象遍历 + 3.0 新字段 + 旧槽位迁移 ============
rep(
`    function _loadIsoState() {
        if (isoState) return;
        try { const s = JSON.parse(localStorage.getItem(ISO_SAVE_KEY)); if (s && s.spaces) isoState = s; } catch (e) { isoState = null; }
        if (!isoState || !isoState.spaces) isoState = { theme: 'cozy', spaces: {} };
        ISO_SPACES.forEach(s => { if (!isoState.spaces[s.key] || !Array.isArray(isoState.spaces[s.key].items)) isoState.spaces[s.key] = { items: [] }; });
        if (ISO_THEMES[isoState.theme] === undefined) isoState.theme = 'cozy';
        if (isoState.theme === 'beach') isoState.theme = 'cozy'; // 一次性迁移到新风格（沙滩主题仍可手动选回）
        if (!isoState.hidden) isoState.hidden = {};
        if (!isoState.view) isoState.view = { x: 0, y: 0, zoom: 0.85 };
        // 小屋 2.0 新字段
        if (isoState.night === undefined) isoState.night = false;
        if (!Array.isArray(isoState.awards)) isoState.awards = [];
        if (!Array.isArray(isoState.slots)) isoState.slots = [null, null, null];
        if (typeof isoState.slot !== 'number') isoState.slot = 0;
        if (isoState.tasksDone === undefined) isoState.tasksDone = false;
        if (isoState.tasksDismissed === undefined) isoState.tasksDismissed = false;
        isoPan = { x: isoState.view.x, y: isoState.view.y, zoom: isoState.view.zoom };
    }`,
`    function _loadIsoState() {
        if (isoState) return;
        try { const s = JSON.parse(localStorage.getItem(ISO_SAVE_KEY)); if (s && s.spaces) isoState = s; } catch (e) { isoState = null; }
        if (!isoState || !isoState.spaces) isoState = { theme: 'cozy', spaces: {} };
        Object.keys(ISO_SPACES).forEach(k => { if (!isoState.spaces[k] || !Array.isArray(isoState.spaces[k].items)) isoState.spaces[k] = { items: [] }; });
        if (ISO_THEMES[isoState.theme] === undefined) isoState.theme = 'cozy';
        if (isoState.theme === 'beach') isoState.theme = 'cozy'; // 一次性迁移到新风格（沙滩主题仍可手动选回）
        if (!isoState.hidden) isoState.hidden = {};
        if (!isoState.view) isoState.view = { x: 0, y: 0, zoom: 0.85 };
        if (isoState.night === undefined) isoState.night = false;
        // 小屋 3.0 新字段：户型 / 光影微调 / 自由摆放 / 无限方案
        if (!ISO_HOUSES.some(h => h.key === isoState.houseKey)) isoState.houseKey = 'loft';
        if (!isoState.light || typeof isoState.light !== 'object') isoState.light = { bright: 0.5, warm: 0.5 };
        if (isoState.freePlace === undefined) isoState.freePlace = false;
        if (!Array.isArray(isoState.plans)) isoState.plans = [];
        // 旧版 3 槽位方案 → 无限方案列表迁移（老数据不丢）
        if (isoState.plans.length === 0 && Array.isArray(isoState.slots)) {
            const names = ['方案一', '方案二', '方案三'];
            isoState.slots.forEach(function (sp, i) {
                if (sp && typeof sp === 'object' && Object.keys(sp).length) {
                    isoState.plans.push({ id: 'plan_mig_' + i, name: names[i], note: '从旧版方案迁移', spaces: sp, theme: isoState.theme, houseKey: 'loft', night: false, light: { bright: 0.5, warm: 0.5 }, at: Date.now() });
                }
            });
        }
        if (!isoState.plans.length) isoState.plans.push({ id: 'plan_default', name: '我的第一套方案', note: '', spaces: JSON.parse(JSON.stringify(isoState.spaces)), theme: isoState.theme, houseKey: isoState.houseKey, night: isoState.night, light: isoState.light, at: Date.now() });
        if (!isoState.plans.find(p => p.id === isoState.activePlanId)) isoState.activePlanId = isoState.plans[0].id;
        if (!isoState.plans.find(p => p.id === isoState.homePlanId)) isoState.homePlanId = null;
        isoPan = { x: isoState.view.x, y: isoState.view.y, zoom: isoState.view.zoom };
    }`,
'_loadIsoState 3.0');

// ============ 2. _spaceTheme 拆分（总览可传 plan 主题） ============
rep(
`    function _spaceTheme(key) { return key === 'gaming' ? 'cyber' : (ISO_THEMES[isoState.theme] ? isoState.theme : 'cozy'); }`,
`    function _spaceThemeFor(key, fallback) { return key === 'gaming' ? 'cyber' : (ISO_THEMES[fallback] ? fallback : 'cozy'); }
    function _spaceTheme(key) { return _spaceThemeFor(key, isoState.theme); }`,
'_spaceTheme 拆分');

// ============ 3. 楼层/空间标签：按当前户型渲染 ============
rep(
`        wrap.innerHTML = ISO_SPACES.map(function (s) {
            return '<button class="iso-space-tab ' + (s.key === isoSpaceKey ? 'selected' : '') + '" onclick="setIsoSpace(\\'' + s.key + '\\')">' + s.tag + ' · ' + s.name + '</button>';
        }).join('');`,
`        wrap.innerHTML = _isoHouseSpaces().map(function (k) {
            const s = ISO_SPACES[k];
            return '<button class="iso-space-tab ' + (k === isoSpaceKey ? 'selected' : '') + '" onclick="setIsoSpace(\\'' + k + '\\')">' + s.tag + ' · ' + s.name + '</button>';
        }).join('');`,
'_renderIsoTabs 按户型');

rep(
`        wrap.innerHTML = ISO_SPACES.map(function (s) {
            const off = !!isoState.hidden[s.key];
            return '<button class="iso-space-tab ' + (off ? '' : 'selected') + '" onclick="toggleIsoFloor(\\'' + s.key + '\\')">' + (off ? '🚫 ' : '👁 ') + s.tag + ' · ' + s.name + '</button>';
        }).join('');`,
`        wrap.innerHTML = _isoHouseSpaces().map(function (k) {
            const s = ISO_SPACES[k];
            const off = !!isoState.hidden[k];
            return '<button class="iso-space-tab ' + (off ? '' : 'selected') + '" onclick="toggleIsoFloor(\\'' + k + '\\')">' + (off ? '🚫 ' : '👁 ') + s.tag + ' · ' + s.name + '</button>';
        }).join('');`,
'_renderIsoFloorToggles 按户型');

// ============ 4. _pushWalls：窗型（tall 落地飘窗 / small 小屋窗） ============
rep(
`// 窗：白窗框 + 主题玻璃 + 斜向高光 + 窗台；夜晚玻璃透暖光 + 光晕
        const win = function (gx) {
            const w = P(gx, 0);
            const x0 = w[0] - 13 * S, x1 = w[0] + 13 * S, yT = w[1] - 48 * S, yB = w[1] - 8 * S;`,
`// 窗：白窗框 + 主题玻璃 + 斜向高光 + 窗台；夜晚玻璃透暖光 + 光晕；win 型：tall 落地飘窗 / small 小屋圆窗 / std 标准
        const winCfg = opts.win || 'std';
        const winHalf = (winCfg === 'tall' ? 16 : winCfg === 'small' ? 9 : 13);
        const winTop = (winCfg === 'tall' ? 60 : winCfg === 'small' ? 42 : 48);
        const winBot = (winCfg === 'tall' ? 4 : 8);
        const win = function (gx) {
            const w = P(gx, 0);
            const x0 = w[0] - winHalf * S, x1 = w[0] + winHalf * S, yT = w[1] - winTop * S, yB = w[1] - winBot * S;`,
'_pushWalls 窗型');

// ============ 5. _pushFloor：草地 / 石板材质 ============
rep(
`                let fill, line;
                if (mat === 'tile') { fill = alt ? theme.tile : _shade(theme.tile, 0.95); line = theme.tileLine; }
                else if (mat === 'carpet') { fill = alt ? theme.carpet : _shade(theme.carpet, 0.965); line = theme.carpetLine; }
                else { fill = alt ? theme.wood : _shade(theme.wood, 0.955); line = theme.woodLine; }
                if (night) { fill = _shade(fill, 0.55); line = _shade(line, 0.6); }`,
`                let fill, line;
                if (mat === 'tile') { fill = alt ? theme.tile : _shade(theme.tile, 0.95); line = theme.tileLine; }
                else if (mat === 'carpet') { fill = alt ? theme.carpet : _shade(theme.carpet, 0.965); line = theme.carpetLine; }
                else if (mat === 'grass') { fill = alt ? theme.grass : _shade(theme.grass, 0.955); line = theme.grassLine; }
                else if (mat === 'stone') { fill = alt ? '#EDE7DA' : '#E2DBC9'; line = '#D2C8B0'; }
                else { fill = alt ? theme.wood : _shade(theme.wood, 0.955); line = theme.woodLine; }
                if (night) { fill = _shade(fill, 0.55); line = _shade(line, 0.6); }`,
'_pushFloor 材质');

rep(
`                if (mat === 'carpet') {
                    out.push('<circle cx="' + Math.round(p[0] - 9 * S) + '" cy="' + Math.round(p[1] + 7 * S) + '" r="' + Math.max(1, 2 * S) + '" fill="' + line + '" opacity="0.65"/>');
                    out.push('<circle cx="' + Math.round(p[0] + 8 * S) + '" cy="' + Math.round(p[1] + 13 * S) + '" r="' + Math.max(1, 1.6 * S) + '" fill="' + line + '" opacity="0.5"/>');
                }`,
`                if (mat === 'carpet') {
                    out.push('<circle cx="' + Math.round(p[0] - 9 * S) + '" cy="' + Math.round(p[1] + 7 * S) + '" r="' + Math.max(1, 2 * S) + '" fill="' + line + '" opacity="0.65"/>');
                    out.push('<circle cx="' + Math.round(p[0] + 8 * S) + '" cy="' + Math.round(p[1] + 13 * S) + '" r="' + Math.max(1, 1.6 * S) + '" fill="' + line + '" opacity="0.5"/>');
                }
                if (mat === 'grass') {
                    out.push('<circle cx="' + Math.round(p[0] - 10 * S) + '" cy="' + Math.round(p[1] + 9 * S) + '" r="' + Math.max(1, 1.8 * S) + '" fill="' + line + '" opacity="0.7"/>');
                    out.push('<circle cx="' + Math.round(p[0] + 8 * S) + '" cy="' + Math.round(p[1] + 20 * S) + '" r="' + Math.max(1, 1.5 * S) + '" fill="' + line + '" opacity="0.6"/>');
                    if (alt) out.push('<circle cx="' + Math.round(p[0] + 2 * S) + '" cy="' + Math.round(p[1] + 14 * S) + '" r="' + Math.max(1, 2 * S) + '" fill="' + (night ? '#D9C08A' : '#F9C6D9') + '" opacity="0.85"/>');
                }
                if (mat === 'stone') {
                    out.push('<circle cx="' + Math.round(p[0] - 8 * S) + '" cy="' + Math.round(p[1] + 12 * S) + '" r="' + Math.max(1.5, 4.5 * S) + '" fill="' + line + '" opacity="0.5"/>');
                    out.push('<circle cx="' + Math.round(p[0] + 9 * S) + '" cy="' + Math.round(p[1] + 20 * S) + '" r="' + Math.max(1, 3 * S) + '" fill="' + line + '" opacity="0.45"/>');
                }`,
'_pushFloor 草地石板纹理');

// ============ 6. 新增渲染助手：光影 / 栅栏 / 阳台（插在 _lastOverviewSvg 前） ============
rep(
`    let _lastOverviewSvg = ''; // 总览 SVG 原串（截图导出用）`,
`    let _lastOverviewSvg = ''; // 总览 SVG 原串（截图导出用）

    // —— 光影系统：亮度/色温 → 全画布罩色（编辑器 / 总览 / 导出 / 首页卡片共用；st 可传方案数据） ——
    function _lightAdj(st) {
        const src = st || isoState || {};
        const L = src.light || {};
        return { night: !!src.night, b: (L.bright === undefined ? 0.5 : L.bright), w: (L.warm === undefined ? 0.5 : L.warm) };
    }
    function _lightOverlays(st) {
        const a = _lightAdj(st);
        const rects = [];
        const warmA = Math.abs(a.w - 0.5) * 0.4;
        if (warmA > 0.02) rects.push(a.w > 0.5 ? { c: 'rgba(255,172,84,', o: warmA } : { c: 'rgba(104,158,255,', o: warmA });
        if (a.b < 0.47) rects.push({ c: 'rgba(22,22,50,', o: (0.47 - a.b) * 0.8 });
        else if (a.b > 0.53) rects.push({ c: 'rgba(255,252,235,', o: (a.b - 0.53) * 0.45 });
        return rects;
    }
    function _lightSvgRects(st, x, y, w, h) {
        return _lightOverlays(st).map(function (r) {
            return '<rect x="' + Math.round(x) + '" y="' + Math.round(y) + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '" fill="' + r.c + r.o.toFixed(3) + ')" style="pointer-events:none"/>';
        }).join('');
    }
    function _lightBgCss() {
        const a = _lightAdj();
        let top = a.night ? [42, 46, 85] : [253, 246, 236], bot = a.night ? [58, 64, 112] : [250, 237, 216];
        const mix = function (c, t, k) { return c.map(function (v, i) { return Math.round(v + (t[i] - v) * k); }); };
        if (a.w > 0.5) { top = mix(top, [255, 214, 160], (a.w - 0.5) * 0.7); bot = mix(bot, [255, 196, 140], (a.w - 0.5) * 0.7); }
        else { top = mix(top, [196, 222, 255], (0.5 - a.w) * 0.6); bot = mix(bot, [184, 214, 255], (0.5 - a.w) * 0.6); }
        if (a.b < 0.5) { const k = (0.5 - a.b) * 0.9; top = mix(top, [24, 26, 52], k); bot = mix(bot, [30, 32, 62], k); }
        else { const k = (a.b - 0.5) * 0.5; top = mix(top, [255, 255, 250], k); bot = mix(bot, [255, 255, 248], k); }
        return 'linear-gradient(180deg, rgb(' + top.join(',') + ') 0%, rgb(' + bot.join(',') + ') 100%)';
    }

    // —— 户外白栅栏（花园边界）：尖桩 + 双横杆 + 面向主楼一侧开门 ——
    function _pushFence(out, P, S, theme, G, night, gateSide) {
        const H = 30 * S;
        const pw = Math.max(2.5, 4.5 * S);
        const colW = night ? '#E8E2D2' : '#FFFFFF';
        const post = function (x, y, tall) {
            const h = H * (tall ? 1.35 : 1);
            out.push('<polygon points="' + Math.round(x - pw / 2) + ',' + Math.round(y - h - 4 * S) + ' ' + Math.round(x) + ',' + Math.round(y - h - 9 * S) + ' ' + Math.round(x + pw / 2) + ',' + Math.round(y - h - 4 * S) + ' ' + Math.round(x + pw / 2) + ',' + Math.round(y) + ' ' + Math.round(x - pw / 2) + ',' + Math.round(y) + '" fill="' + colW + '" stroke="' + (night ? '#C9C2AE' : '#E8E2D2') + '" stroke-width="1" stroke-linejoin="round"/>');
        };
        const rail = function (ax, ay, bx, by) {
            out.push('<line x1="' + Math.round(ax) + '" y1="' + Math.round(ay - H * 0.32) + '" x2="' + Math.round(bx) + '" y2="' + Math.round(by - H * 0.32) + '" stroke="' + colW + '" stroke-width="' + Math.max(2.5, 4 * S) + '" stroke-linecap="round"/>');
            out.push('<line x1="' + Math.round(ax) + '" y1="' + Math.round(ay - H * 0.68) + '" x2="' + Math.round(bx) + '" y2="' + Math.round(by - H * 0.68) + '" stroke="' + colW + '" stroke-width="' + Math.max(2.5, 4 * S) + '" stroke-linecap="round"/>');
        };
        const A = P(0, 0), B = P(G.cols, 0), C = P(0, G.rows);
        rail(A[0], A[1], B[0], B[1]);
        rail(A[0], A[1], C[0], C[1]);
        let skipL = -1, skipR = -1;
        if (gateSide === 'right') { skipL = Math.floor(G.cols * 0.4); skipR = Math.floor(G.cols * 0.6); }
        for (let gx = 0; gx <= G.cols; gx++) { if (gx >= skipL && gx <= skipR) continue; const p = P(gx, 0); post(p[0], p[1], false); }
        let sgL = -1, sgR = -1;
        if (gateSide === 'left') { sgL = Math.floor(G.rows * 0.4); sgR = Math.floor(G.rows * 0.6); }
        for (let gy = 1; gy <= G.rows; gy++) { if (gy >= sgL && gy <= sgR) continue; const p = P(0, gy); post(p[0], p[1], false); }
        if (gateSide === 'right') {
            const a = P(skipL, 0), b = P(skipR, 0);
            post(a[0], a[1], true); post(b[0], b[1], true);
            out.push('<line x1="' + Math.round(a[0]) + '" y1="' + Math.round(a[1] - H * 1.3) + '" x2="' + Math.round(b[0]) + '" y2="' + Math.round(b[1] - H * 1.3) + '" stroke="#A8D8BE" stroke-width="' + Math.max(3, 5 * S) + '" stroke-linecap="round"/>');
        } else if (gateSide === 'left') {
            const a = P(0, sgL), b = P(0, sgR);
            post(a[0], a[1], true); post(b[0], b[1], true);
            out.push('<line x1="' + Math.round(a[0]) + '" y1="' + Math.round(a[1] - H * 1.3) + '" x2="' + Math.round(b[0]) + '" y2="' + Math.round(b[1] - H * 1.3) + '" stroke="#A8D8BE" stroke-width="' + Math.max(3, 5 * S) + '" stroke-linecap="round"/>');
        }
    }

    // —— 外延阳台（loft 1F / 开间公寓）：前缘木甲板 + 白栏杆 + 角落花盆 ——
    function _pushBalcony(out, P, S, theme, G, night) {
        const x0 = Math.floor(G.cols * 0.5), x1 = G.cols, y0 = G.rows, y1 = G.rows + 1.35;
        const A = P(x0, y0), B = P(x1, y0), C = P(x1, y1), D = P(x0, y1);
        const wN = night ? 0.62 : 1;
        out.push('<polygon points="' + [A, B, C, D].map(p => Math.round(p[0]) + ',' + Math.round(p[1])).join(' ') + '" fill="' + _shade(theme.wood, 0.98 * wN) + '" stroke="' + _shade(theme.woodLine, wN) + '" stroke-width="2" stroke-linejoin="round"/>');
        for (let i = 1; i < 4; i++) {
            const t = i / 4;
            const e = P(x0 + (x1 - x0) * t, y0), f = P(x0 + (x1 - x0) * t, y1);
            out.push('<line x1="' + Math.round(e[0]) + '" y1="' + Math.round(e[1]) + '" x2="' + Math.round(f[0]) + '" y2="' + Math.round(f[1]) + '" stroke="' + _shade(theme.woodLine, wN) + '" stroke-width="1.5"/>');
        }
        out.push('<polygon points="' + Math.round(D[0]) + ',' + Math.round(D[1]) + ' ' + Math.round(A[0]) + ',' + Math.round(A[1]) + ' ' + Math.round(A[0]) + ',' + Math.round(A[1] + 8 * S) + ' ' + Math.round(D[0]) + ',' + Math.round(D[1] + 8 * S) + '" fill="' + _shade(theme.wood, 0.85 * wN) + '"/>');
        const H = 24 * S;
        const colW = night ? '#E8E2D2' : '#FFFFFF';
        const post2 = function (x, y) {
            out.push('<line x1="' + Math.round(x) + '" y1="' + Math.round(y) + '" x2="' + Math.round(x) + '" y2="' + Math.round(y - H) + '" stroke="' + colW + '" stroke-width="' + Math.max(2.5, 4 * S) + '" stroke-linecap="round"/>');
        };
        for (let i = 0; i <= 4; i++) { const t = i / 4; const p = P(x0 + (x1 - x0) * t, y1); post2(p[0], p[1]); }
        for (let j = 0; j <= 2; j++) { const t = j / 2; const p = P(x1, y0 + (y1 - y0) * t); post2(p[0], p[1]); }
        const rA = P(x0, y1), rB = P(x1, y1), rC = P(x1, y0);
        out.push('<line x1="' + Math.round(rA[0]) + '" y1="' + Math.round(rA[1] - H * 0.7) + '" x2="' + Math.round(rB[0]) + '" y2="' + Math.round(rB[1] - H * 0.7) + '" stroke="' + colW + '" stroke-width="' + Math.max(2.5, 4 * S) + '" stroke-linecap="round"/>');
        out.push('<line x1="' + Math.round(rB[0]) + '" y1="' + Math.round(rB[1] - H * 0.7) + '" x2="' + Math.round(rC[0]) + '" y2="' + Math.round(rC[1] - H * 0.7) + '" stroke="' + colW + '" stroke-width="' + Math.max(2.5, 4 * S) + '" stroke-linecap="round"/>');
        const p1 = P(x1 - 0.6, y1 - 0.4);
        out.push('<text x="' + Math.round(p1[0]) + '" y="' + Math.round(p1[1] - 6 * S) + '" font-size="' + Math.round(13 * S + 5) + '" text-anchor="middle">🌸</text>');
        const p2 = P(x0 + 0.4, y1 - 0.3);
        out.push('<text x="' + Math.round(p2[0]) + '" y="' + Math.round(p2[1] - 6 * S) + '" font-size="' + Math.round(12 * S + 4) + '" text-anchor="middle">🪴</text>');
    }`,
'渲染助手：光影/栅栏/阳台');

fs.writeFileSync(file, html, 'utf8');
console.log('JS 补丁 B1 完成，共 ' + n + ' 处 ✓');
