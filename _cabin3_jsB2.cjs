// 小屋 3.0 JS 补丁 B2：总览通用化 + 编辑器改造
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

// ============ 1. 楼层显隐动画 → 淡入淡出重排（任意户型通用） ============
cut(
'    // —— 总览布局状态：dy = 2F 下移量（0=叠在 1F 正上方，1=落到地面），op1/op2 = 两层淡入淡出透明度 ——',
'    // —— 花藤饰边（楼板前缘 / 屋顶边缘的一排绿叶小花） ——',
`    // —— 楼层显隐切换：快速淡出重排再淡入（任意户型通用；隐藏楼层后剩余楼层自动落地成完整建筑） ——
    let _ovAnimId = null;
    function _animateIsoHouse() {
        if (_ovAnimId) { clearTimeout(_ovAnimId); _ovAnimId = null; }
        const wrap = document.getElementById('isoHouse');
        if (!wrap) { _renderIsoHouse(); return; }
        wrap.style.transition = 'opacity 0.16s ease';
        wrap.style.opacity = '0.25';
        _ovAnimId = setTimeout(function () {
            _renderIsoHouse();
            wrap.style.opacity = '1';
            _ovAnimId = null;
        }, 160);
    }

`,
'楼层显隐动画简化');

// ============ 2. _renderIsoHouse → 通用 _buildOverviewSvg + 瘦身外壳 ============
cut(
'    function _renderIsoHouse() {',
'    let isoEditOpen = false;',
`    // —— 通用总览绘制：任意户型/任意方案 → SVG + 热点（总览页与首页小屋卡片共用） ——
    function _buildOverviewSvg(st) {
        const S = 0.5;
        const G = ISO_GRID;
        const house = ISO_HOUSES.find(h => h.key === st.houseKey) || ISO_HOUSES[0];
        const night = !!st.night;
        const hidden = st.hidden || {};
        const themeKey = ISO_THEMES[st.theme] ? st.theme : 'cozy';
        const groundTheme = ISO_THEMES[themeKey] || ISO_THEMES.cozy;
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        const out = [];
        const track = function (x0, y0, x1, y1) { minX = Math.min(minX, x0, x1); maxX = Math.max(maxX, x0, x1); minY = Math.min(minY, y0, y1); maxY = Math.max(maxY, y0, y1); };
        const P = function (ox, oy, gx, gy) { return [ox + (gx - gy) * 32 * S, oy + (gx + gy) * 16 * S]; };
        const poly = function (pts, fill, opacity, strokeW) {
            pts.forEach(function (p) { track(p[0], p[1], p[0], p[1]); });
            out.push('<polygon points="' + pts.map(function (p) { return Math.round(p[0]) + ',' + Math.round(p[1]); }).join(' ') + '" fill="' + fill + '"' + (opacity ? ' opacity="' + opacity + '"' : '') + ' stroke="' + fill + '" stroke-width="' + (strokeW || Math.max(1, 2 * S)) + '" stroke-linejoin="round"/>');
        };
        const text = function (x, y, size, str, color) {
            track(x - size * 2, y - size, x + size * 2, y + size * 0.4);
            out.push('<text x="' + Math.round(x) + '" y="' + Math.round(y) + '" font-size="' + size + '" font-weight="600" fill="' + (color || '#85532E') + '" text-anchor="middle">' + str + '</text>');
        };
        const vineTrim = function (ax, ay, bx, by) { _vineTrim(out, track, S, ax, ay, bx, by); };
        const furn = function (it, ox, oy, tk) {
            const p = P(ox, oy, it.gx + 0.5, it.gy + 0.5);
            const frag = _furnSVGHTML(it.k, (it.s || 1) * S, p[0], p[1], tk, it.rot, it);
            if (frag) { out.push(frag); track(p[0] - 60 * S, p[1] - 72 * S, p[0] + 66 * S, p[1] + 22 * S); }
            else text(p[0], p[1], 24, it.e || '📦');
        };
        // 布局栈：主楼居中，花园/副楼按 dx 摆放；隐藏楼层自动落位补齐建筑
        const stackW = (G.cols + G.rows) * 32 * S;
        const pitch = stackW + 34 * S;
        const mainOx = 170, mainOy = 150;
        const stackH = G.wallH * S;
        const stacks = house.layout.map(function (lay) {
            return { dx: lay.dx, floors: lay.floors.filter(function (k) { return !hidden[k]; }), total: lay.floors.length };
        }).filter(function (s) { return s.floors.length > 0; });
        const oxOf = function (dx) { return mainOx + dx * pitch; };
        // 统一大草坪（托起所有建筑与院子）
        (function () {
            const ts = pitch / (64 * S);
            let a0 = 1e9, a1 = -1e9;
            stacks.forEach(function (s) { const a = s.dx * ts; a0 = Math.min(a0, a); a1 = Math.max(a1, a); });
            if (a0 > a1) { a0 = 0; a1 = 0; }
            const m = 1.15;
            const A = P(mainOx, mainOy, a0 - m, -a1 - m), B = P(mainOx, mainOy, a1 + G.cols + m, -a1 - m), C = P(mainOx, mainOy, a1 + G.cols + m, -a0 + G.rows + m), D = P(mainOx, mainOy, a0 - m, -a0 + G.rows + m);
            poly([A, B, C, D], night ? _shade(groundTheme.grass, 0.55) : groundTheme.grass, null, 18 * S);
        })();
        const stone = function (x, y, r) {
            poly([[x, y - r * S], [x + 2 * r * S, y], [x, y + r * S], [x - 2 * r * S, y]], night ? '#B8A68C' : '#EAD9B8', null, 5 * S);
        };
        const spots = [];
        stacks.forEach(function (s) {
            const ox = oxOf(s.dx);
            s.floors.forEach(function (key, idx) { spots.push({ key: key, ox: ox, oy: mainOy - idx * stackH, idx: idx, stack: s }); });
        });
        // 建筑落地阴影
        spots.forEach(function (p) {
            if (!ISO_SPACES[p.key] || ISO_SPACES[p.key].outdoor) return;
            out.push('<ellipse cx="' + Math.round(p.ox + 48) + '" cy="' + Math.round(p.oy + 82) + '" rx="152" ry="62" fill="rgba(94,58,32,0.10)"/>');
            track(p.ox - 110, p.oy + 16, p.ox + 206, p.oy + 148);
        });
        // 栈间石板小径
        if (stacks.length >= 2) {
            const xs = stacks.map(function (s) { return oxOf(s.dx); }).sort(function (a, b) { return a - b; });
            for (let i = 0; i < xs.length - 1; i++) {
                [0.22, 0.5, 0.78].forEach(function (t) { stone(xs[i] + (xs[i + 1] - xs[i]) * t + 50, mainOy + 28 + 96 * t, 15); });
            }
        }
        // 花园栈（垫底画）：栅栏 + 门 + 草地 + 点缀
        spots.filter(function (p) { return ISO_SPACES[p.key] && ISO_SPACES[p.key].outdoor; }).forEach(function (p) {
            const sp = ISO_SPACES[p.key];
            const PP = function (gx, gy) { return P(p.ox, p.oy, gx, gy); };
            _pushFloor(out, track, PP, S, groundTheme, sp, G, night);
            _pushPlatformSides(out, PP, S, { wood: groundTheme.grass, woodLine: groundTheme.grassLine }, G, night, 12);
            _pushFence(out, PP, S, groundTheme, G, night, p.stack.dx > 0 ? 'left' : 'right');
            const t1 = PP(1.6, 1.4); text(t1[0], t1[1] - 10, 22, '🌳');
            const t2 = PP(2.8, 5.2); text(t2[0], t2[1] - 6, 14, '🌷');
            const t3 = PP(0.6, 4.2); text(t3[0], t3[1] - 4, 13, '🪨');
            const t4 = PP(7.2, 5.6); text(t4[0], t4[1] - 6, 15, '🌻');
            sp.zones.forEach(function (z) {
                const zp = PP(z.c0 + (z.c1 - z.c0 + 1) / 2, z.r0 + 0.9);
                text(zp[0], zp[1] - 40 * S, Math.round(11 * S + 3), z.name, night ? '#F5E6C8' : '#85532E');
            });
            ((st.spaces[p.key] || {}).items || []).forEach(function (it) { furn(it, p.ox, p.oy, themeKey); });
        });
        // 室内楼层：自下而上
        spots.filter(function (p) { return ISO_SPACES[p.key] && !ISO_SPACES[p.key].outdoor; }).forEach(function (p) {
            const sp = ISO_SPACES[p.key];
            const theme = ISO_THEMES[_spaceThemeFor(p.key, themeKey)] || groundTheme;
            const PP = function (gx, gy) { return P(p.ox, p.oy, gx, gy); };
            if (p.idx > 0) _pushIsoSlab(out, track, P, S, p.ox, p.oy, theme, G, night, 16, true, false);
            _pushWalls(out, track, PP, S, theme, G, { stickers: p.key === 'gaming', night: night, win: sp.win });
            _pushFloor(out, track, PP, S, theme, sp, G, night);
            if (sp.balcony && p.idx === 0) _pushBalcony(out, PP, S, theme, G, night);
            if (p.idx === 0) _pushPlatformSides(out, PP, S, theme, G, night, 14);
            (sp.dividers || []).forEach(function (dx) {
                const p0 = P(p.ox, p.oy, dx, 0), p1 = P(p.ox, p.oy, dx, G.rows);
                const H = 54 * S;
                poly([[p0[0], p0[1] - H], [p1[0], p1[1] - H], [p1[0], p1[1] + 2 * S], [p0[0], p0[1] + 2 * S]], theme.wallShade);
            });
            const H2 = 22 * S;
            const fa1 = P(p.ox, p.oy, G.cols, 0), fa2 = P(p.ox, p.oy, G.cols, G.rows);
            poly([[fa1[0], fa1[1] - H2], [fa2[0], fa2[1] - H2], [fa2[0], fa2[1]], [fa1[0], fa1[1]]], theme.frontWall);
            const fb1 = P(p.ox, p.oy, 0, G.rows), fb2 = P(p.ox, p.oy, G.cols, G.rows);
            poly([[fb1[0], fb1[1] - H2], [fb2[0], fb2[1] - H2], [fb2[0], fb2[1]], [fb1[0], fb1[1]]], theme.frontWall);
            sp.zones.forEach(function (z) {
                const zp = P(p.ox, p.oy, z.c0 + (z.c1 - z.c0 + 1) / 2, z.r0 + 0.9);
                text(zp[0], zp[1] - 46 * S, Math.round(11 * S + 3), z.name, night ? '#F5E6C8' : '#85532E');
            });
            ((st.spaces[p.key] || {}).items || []).forEach(function (it) { furn(it, p.ox, p.oy, _spaceThemeFor(p.key, themeKey)); });
            // 顶层：墙顶花藤；上方还有被隐藏的楼层 → 盖屋顶厚板收口
            if (p.idx === p.stack.floors.length - 1) {
                const rA = PP(0, 0), rB = PP(G.cols, 0), rC = PP(0, G.rows);
                const lift = G.wallH * S + 8 * S;
                vineTrim(rA[0], rA[1] - lift, rB[0], rB[1] - lift);
                vineTrim(rA[0], rA[1] - lift, rC[0], rC[1] - lift);
                if (p.stack.floors.length < p.stack.total) {
                    _pushIsoSlab(out, track, P, S, p.ox, p.oy - stackH, theme, G, night, 10, true, true, night ? _shade(theme.roof, 0.6) : theme.roof);
                }
            }
        });
        // 草坪点缀：喷泉 + 花
        if (spots.length) {
            const sideOx = stacks.length >= 2 ? oxOf(stacks[0].dx) : mainOx - 130;
            text(sideOx + 40, mainOy + 208, 22, '⛲');
            text(mainOx - 52, mainOy + 162, 14, '🌷');
        }
        // 夜空：月亮 + 星星 + 萤火虫
        if (night) {
            text(mainOx - 150, mainOy - 70, 26, '🌙');
            [[mainOx - 40, mainOy - 92, 11], [mainOx + 120, mainOy - 106, 9], [mainOx + 320, mainOy - 98, 10], [mainOx + 520, mainOy - 44, 9], [mainOx + 600, mainOy + 40, 11], [mainOx - 120, mainOy + 40, 9]].forEach(function (st2) { text(st2[0], st2[1], st2[2], '✦', '#F5E6C8'); });
            [[mainOx + 40, mainOy + 180], [mainOx + 180, mainOy + 230], [mainOx + 330, mainOy + 212], [mainOx + 480, mainOy + 172]].forEach(function (f) {
                out.push('<circle cx="' + Math.round(f[0]) + '" cy="' + Math.round(f[1]) + '" r="' + Math.round(3.5 * S + 1.5) + '" fill="rgba(255, 224, 130, 0.75)"/>');
                out.push('<circle cx="' + Math.round(f[0]) + '" cy="' + Math.round(f[1]) + '" r="' + Math.round(9 * S + 3) + '" fill="rgba(255, 224, 130, 0.18)"/>');
                track(f[0] - 14, f[1] - 14, f[0] + 14, f[1] + 14);
            });
        }
        // 小居民：白天在院里溜达，夜晚上最高层睡觉
        {
            const homeUids = Object.keys(appData.users || {}).slice(0, 2);
            const mainStack = stacks.find(function (s) { return s.dx === 0; }) || stacks[0];
            if (!night && mainStack) {
                const mox = oxOf(mainStack.dx);
                homeUids.forEach(function (uid, i) {
                    const c = P(mox, mainOy, 2.2 + i * 2.4, G.rows + 1.3 + (i % 2) * 0.5);
                    text(c[0], c[1], 17, getAvatarEmoji(uid) || '🌰');
                });
            } else if (night) {
                let top = null;
                spots.forEach(function (p) { if (!ISO_SPACES[p.key].outdoor && (!top || p.oy < top.oy)) top = p; });
                if (top) { const zc = P(top.ox, top.oy, 3.4, 3.2); text(zc[0], zc[1] - 34 * S, 13, '💤'); }
            }
        }
        // 光影罩层 + 输出
        const w = Math.ceil(maxX - minX), h = Math.ceil(maxY - minY);
        const lightRects = _lightSvgRects(st, minX, minY, w, h);
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="' + Math.floor(minX) + ' ' + Math.floor(minY) + ' ' + w + ' ' + h + '" style="display:block">' + out.join('') + lightRects + '</svg>';
        const hotspots = spots.map(function (p) {
            const outdoor = !!ISO_SPACES[p.key].outdoor;
            const tl = P(p.ox, p.oy, 0, 0), r = P(p.ox, p.oy, G.cols, 0), b = P(p.ox, p.oy, G.cols, G.rows), l = P(p.ox, p.oy, 0, G.rows);
            const lx = Math.min(tl[0], l[0]) - 4, rx = Math.max(r[0], b[0]) + 4;
            const ty = tl[1] - (outdoor ? 30 * S : ISO_GRID.wallH * S) - 10;
            const by = b[1] + (ISO_SPACES[p.key].balcony ? 52 * S : 26 * S);
            return { key: p.key, lx: lx, ty: ty, rx: rx, by: by };
        });
        return { svg: svg, w: w, h: h, minX: minX, minY: minY, spots: hotspots, night: night };
    }
    function _renderIsoHouse() {
        const wrap = document.getElementById('isoHouse');
        if (!wrap) return;
        const r = _buildOverviewSvg({ spaces: isoState.spaces, theme: isoState.theme, houseKey: isoState.houseKey, hidden: isoState.hidden, night: isoState.night });
        _lastOverviewSvg = r.svg;
        const hotspots = r.spots.map(function (hs) {
            return '<div class="house-hotspot" data-space="' + hs.key + '" style="left:' + Math.round(hs.lx - r.minX) + 'px;top:' + Math.round(hs.ty - r.minY) + 'px;width:' + Math.round(hs.rx - hs.lx) + 'px;height:' + Math.round(hs.by - hs.ty) + 'px" title="点击布置"></div>';
        }).join('');
        const cw = (wrap.clientWidth || 380) - 4;
        const k = Math.min(1, cw / r.w);
        wrap.style.background = _lightBgCss();
        wrap.innerHTML = '<div style="position:relative;width:' + Math.round(r.w * k) + 'px;height:' + Math.round(r.h * k) + 'px;margin:0 auto;">' +
            '<div style="position:absolute;left:0;top:0;width:' + r.w + 'px;height:' + r.h + 'px;transform:scale(' + k + ');transform-origin:top left;">' + r.svg + hotspots + '</div>' +
            '</div>';
        wrap.querySelectorAll('.house-hotspot').forEach(function (el) {
            el.addEventListener('click', function () { selectIsoSpace(el.dataset.space); });
        });
    }
`,
'总览渲染通用化');

// ============ 3. _showIsoHouse：去掉成就行 + 夜晚按钮统一 ============
rep(
`        _renderIsoFloorToggles();
        _renderIsoLayoutRow();
        _renderIsoAwardsRow();
        const nb = document.getElementById('isoNightBtn');
        if (nb) nb.innerHTML = isoState.night ? '☀️ 白天' : '🌙 夜晚';
        _renderIsoHouse();`,
`        _renderIsoFloorToggles();
        _renderIsoLayoutRow();
        _updateIsoNightBtns();
        _renderIsoHouse();`,
'_showIsoHouse 精简');

// ============ 4. _fitIsoView：阳台余量 ============
rep(
`        const G = ISO_GRID;
        const contentW = G.rows * 32 + G.cols * 32 + 40;
        const contentH = G.wallH + 30 + (G.cols + G.rows) * 16 + 80;`,
`        const G = ISO_GRID;
        const sp = ISO_SPACES[isoSpaceKey] || {};
        const contentW = G.rows * 32 + G.cols * 32 + 40 + (sp.balcony ? 150 : 0);
        const contentH = G.wallH + 30 + (G.cols + G.rows) * 16 + 80 + (sp.balcony ? 55 : 0);`,
'_fitIsoView 阳台余量');

// ============ 5. selectIsoSpace / setIsoSpace：默认家具分类 + 夜晚按钮 ============
rep(
`    function selectIsoSpace(key) {
        isoEditOpen = true;
        isoSpaceKey = key;
        isoSelId = null;
        heldClear();
        document.getElementById('isoHouseView').classList.add('hidden');
        document.getElementById('isoEditView').classList.remove('hidden');
        _renderIsoTabs();
        _renderIsoThemeRow();
        _renderIsoCombos();
        _renderIsoLib();
        _renderIsoSpace(false);
        _fitIsoView();
        _updateIsoItemBar();
    }`,
`    function _defaultLibCatFor(key) {
        const sp = ISO_SPACES[key];
        if (sp && sp.outdoor) return 'garden';
        if (isoLibCat === 'garden') return 'living';
        return isoLibCat;
    }
    function selectIsoSpace(key) {
        isoEditOpen = true;
        isoSpaceKey = key;
        isoSelId = null;
        heldClear();
        document.getElementById('isoHouseView').classList.add('hidden');
        document.getElementById('isoEditView').classList.remove('hidden');
        isoLibCat = _defaultLibCatFor(key);
        _renderIsoTabs();
        _renderIsoThemeRow();
        _renderIsoCombos();
        _renderIsoLib();
        _updateIsoNightBtns();
        _renderIsoSpace(false);
        _fitIsoView();
        _updateIsoItemBar();
    }`,
'selectIsoSpace 增强');

rep(
`    function setIsoSpace(key) { if (isoSpaceKey === key) return; isoSpaceKey = key; isoSelId = null; heldClear(); _renderIsoTabs(); _renderIsoSpace(true); _updateIsoItemBar(); }`,
`    function setIsoSpace(key) { if (isoSpaceKey === key) return; isoSpaceKey = key; isoSelId = null; heldClear(); isoLibCat = _defaultLibCatFor(key); _renderIsoTabs(); _renderIsoLib(); _renderIsoSpace(true); _updateIsoItemBar(); }`,
'setIsoSpace 增强');

// ============ 6. clearIsoSpace：对象取值 ============
rep(
`        if (!confirm('清空「' + (ISO_SPACES.find(s => s.key === isoSpaceKey) || {}).name + '」的所有家具吗？')) return;`,
`        if (!confirm('全部回收：清空「' + ((ISO_SPACES[isoSpaceKey] || {}).name || '本房间') + '」的所有家具吗？（Ctrl+Z 可撤销）')) return;`,
'clearIsoSpace 对象取值');

fs.writeFileSync(file, html, 'utf8');
console.log('JS 补丁 B2 完成，共 ' + n + ' 处 ✓');
