// 小屋 3.0 JS 补丁 B4：方案行重写 + 导出 SVG + 样板间 + 组合
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

// ============ 1. 样板间补充：花园 / 平层 / 主屋 / 开间 ============
rep(
`        gaming: {
            cyber: [
                ['arcade', 0, 0], ['figurine', 11, 0], ['headset', 2, 1], ['ringlight', 10, 1],
                ['pcbox', 4, 2], ['gdesk', 5, 2], ['gchair', 5, 3], ['gpink', 8, 3],
                ['rug2', 5, 5], ['plantL', 0, 5], ['cushions', 3, 5], ['palm', 11, 5]
            ]
        }
    };`,
`        gaming: {
            cyber: [
                ['arcade', 0, 0], ['figurine', 11, 0], ['headset', 2, 1], ['ringlight', 10, 1],
                ['pcbox', 4, 2], ['gdesk', 5, 2], ['gchair', 5, 3], ['gpink', 8, 3],
                ['rug2', 5, 5], ['plantL', 0, 5], ['cushions', 3, 5], ['palm', 11, 5]
            ]
        },
        garden: {
            cozy: [
                ['flowerarch', 2, 2], ['bench', 2, 4], ['pond', 4, 1], ['fountain', 5, 3],
                ['umbrella', 9, 1], ['lounge', 8, 2], ['swing', 6, 5], ['fenceW', 0, 0], ['fenceW', 11, 5],
                ['glamp', 1, 5], ['glamp', 10, 4], ['sunflower', 0, 2], ['tulips', 11, 2], ['veggie', 1, 1], ['birdhouse', 7, 0]
            ]
        },
        flat: {
            cozy: [
                ['tvstand', 3, 0], ['bookshelf', 0, 0], ['flamp', 0, 3], ['sofa2', 2, 4], ['tea', 3, 4], ['rug2', 3, 3],
                ['fridge', 6, 0], ['stove', 7, 0], ['kcounter', 8, 0], ['dining', 7, 3], ['chair1', 6, 2], ['chair1', 8, 2],
                ['bed2', 10, 1], ['nstand', 9, 1], ['ward', 11, 0], ['lamp1', 9, 3], ['plantL', 0, 5]
            ]
        },
        cot: {
            cozy: [
                ['tvstand', 5, 0], ['bookshelf', 1, 0], ['flamp', 0, 2], ['sofa2', 2, 4], ['tea', 3, 4], ['rug2', 3, 3],
                ['rocker', 6, 4], ['candles', 7, 2], ['stringlight', 0, 0], ['teddy2', 7, 5],
                ['bed2', 9, 1], ['nstand', 8, 1], ['ward', 11, 0], ['dresser', 11, 4], ['plantL', 0, 5]
            ]
        },
        studio: {
            cozy: [
                ['bed2', 1, 1], ['nstand', 0, 1], ['ward', 3, 0], ['rug1', 1, 3],
                ['sofa2', 5, 3], ['tea', 6, 4], ['tvstand', 6, 0], ['bookshelf', 4, 0], ['flamp', 4, 5], ['stable', 8, 3],
                ['kcounter', 10, 0], ['fridge', 9, 0], ['coffee', 11, 2], ['barstool', 9, 3], ['dining', 10, 4], ['plantS', 11, 5], ['goldfish', 8, 0]
            ]
        }
    };`,
'样板间补充');

// ============ 2. 组合预设：加花园两套 ============
rep(
`        { key: 'gameSet', icon: '🎮', label: '电竞桌椅套装', items: [['gdesk', 5, 2], ['monitor', 5, 2], ['keyboard', 5, 2], ['gchair', 5, 3], ['pcbox', 4, 2], ['headset', 4, 1]] }
    ];`,
`        { key: 'gameSet', icon: '🎮', label: '电竞桌椅套装', items: [['gdesk', 5, 2], ['monitor', 5, 2], ['keyboard', 5, 2], ['gchair', 5, 3], ['pcbox', 4, 2], ['headset', 4, 1]] },
        { key: 'gardenTea', icon: '🌿', label: '花园下午茶组合', items: [['floorDeck', 4, 3], ['floorDeck', 5, 3], ['umbrella', 5, 2], ['lounge', 4, 2], ['bench', 5, 4], ['tulips', 6, 3]] },
        { key: 'gardenParty', icon: '🎉', label: '花园派对组合', items: [['fenceW', 3, 0], ['fenceW', 5, 0], ['fenceW', 7, 0], ['flowerarch', 4, 2], ['glamp', 3, 3], ['glamp', 6, 4], ['bbq', 8, 2], ['bench', 4, 5], ['tulips', 2, 4], ['sunflower', 8, 5]] }
    ];`,
'组合预设+花园');

// ============ 3. 旧 3 槽位方案 → 新方案行（快速切换 + 管理） ============
cut(
'    // —— 多方案保存（3 套布置随时切换） ——',
'    // —— 截图导出：总览直接用现成 SVG',
`    // —— 无限装修方案：快速切换 chips + 管理面板（保存/加载/命名/备注/导入导出/设为主界面） ——
    function _isoPlans() { return Array.isArray(isoState.plans) ? isoState.plans : []; }
    function _isoEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function _renderIsoLayoutRow() {
        const wrap = document.getElementById('isoLayoutRow');
        if (!wrap) return;
        const plans = _isoPlans();
        const act = isoState.activePlanId;
        wrap.innerHTML = '<span class="text-[10px] text-[#B08968]">装修方案：</span>' +
            plans.slice(0, 6).map(function (p) {
                return '<button class="iso-space-tab ' + (p.id === act ? 'selected' : '') + '" onclick="isoPlanLoad(\\'' + p.id + '\\')">📂 ' + _isoEsc(p.name || '未命名') + '</button>';
            }).join('') +
            '<button class="iso-theme-btn" onclick="openIsoPlans()">＋ 管理 / 存新方案</button>';
    }

`,
'方案行重写');

// ============ 4. _editorRoomSvg：户外 / 窗型 / 单品缩放 / 光影罩层 ============
cut(
'    function _editorRoomSvg() {',
'    function exportIsoShot() {',
`    function _editorRoomSvg() {
        const G = ISO_GRID;
        const theme = ISO_THEMES[_spaceTheme(isoSpaceKey)] || ISO_THEMES.cozy;
        const sp = ISO_SPACES[isoSpaceKey] || ISO_SPACES.f1;
        const night = !!isoState.night;
        const outdoor = !!sp.outdoor;
        const OX = G.rows * 32 + 60, OY = G.wallH + 40;
        const W = G.rows * 32 + G.cols * 32 + 120, H = G.wallH + 60 + (G.cols + G.rows) * 16 + (sp.balcony ? 190 : 120);
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
            const fA = P(G.cols, 0), fB = P(G.cols, G.rows), fC = P(0, G.rows);
            poly([[fA[0], fA[1]], [fB[0], fB[1]], [fB[0], fB[1] + 3], [fA[0], fA[1] + 3]], _shade(theme.wood, 0.9));
            poly([[fC[0], fC[1]], [fB[0], fB[1]], [fB[0], fB[1] + 3], [fC[0], fC[1] + 3]], _shade(theme.wood, 0.9));
            if (sp.balcony) _pushBalcony(out, P, 1, theme, G, night);
            (sp.dividers || []).forEach(function (dx) {
                const p0 = P(dx, 0), p1 = P(dx, G.rows);
                poly([[p0[0], p0[1] - 54], [p1[0], p1[1] - 54], [p1[0], p1[1] + 2], [p0[0], p0[1] + 2]], theme.wallShade);
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
        isoState.spaces[isoSpaceKey].items.slice().sort(function (a, b) { return (a.gx + a.gy) - (b.gx + b.gy); }).forEach(function (it) {
            const p = P(it.gx + 0.5, it.gy + 0.5);
            const frag = _furnSVGHTML(it.k, it.s || 1, p[0], p[1], _spaceTheme(isoSpaceKey), it.rot, it);
            if (frag) out.push(frag);
        });
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
            '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + (night ? '#323763' : '#FDF6EC') + '"/>' + out.join('') + _lightSvgRects(null, 0, 0, W, H) + '</svg>';
    }
`,
'_editorRoomSvg 重写');

fs.writeFileSync(file, html, 'utf8');
console.log('JS 补丁 B4 完成，共 ' + n + ' 处 ✓');
