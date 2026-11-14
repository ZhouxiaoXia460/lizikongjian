// 3.4 修正：窗户命中区 = 完整视觉框（消除负 margin 导致的窄条命中盒）
const fs = require('fs');
const FILE = require('path').join(__dirname, 'index.html');
let c = fs.readFileSync(FILE, 'utf8');
let applied = 0;
function rep(oldS, newS, label) {
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reSrc = oldS.split('\n').map(esc).join('\\r?\\n');
    const n = (c.match(new RegExp(reSrc, 'g')) || []).length;
    if (n === 0) throw new Error('未找到锚点：' + label);
    if (n > 1) throw new Error('锚点不唯一（' + n + ' 次）：' + label);
    c = c.replace(new RegExp(reSrc), newS.replace(/\$/g, '$$$$'));
    applied++;
}

// 1) 拆出几何函数 + svg 支持无负边距模式
rep(`    function _isoWinSVGHTML(w, themeKey, night, sc) {
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
    }`,
`    function _isoWinGeom(w, themeKey, night) {
        const tk = themeKey || _spaceTheme(isoSpaceKey);
        const theme = ISO_THEMES[tk] || ISO_THEMES.cozy;
        const out = [];
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        const T = function (x0, y0, x1, y1) { minX = Math.min(minX, x0, x1); maxX = Math.max(maxX, x0, x1); minY = Math.min(minY, y0, y1); maxY = Math.max(maxY, y0, y1); };
        _pushIsoWin(out, function () { return [0, 0]; }, 1, theme, night, w, tk, T);
        const gx0 = Math.floor(Math.min(minX, -30) - 6), gy0 = Math.floor(Math.min(minY, -80) - 6);
        const bw = Math.ceil(Math.max(maxX, 26) - gx0 + 6), bh = Math.ceil(Math.max(maxY, 6) - gy0 + 6);
        return { minX: gx0, minY: gy0, bw: bw, bh: bh };
    }
    function _isoWinSVGHTML(w, themeKey, night, sc, noMargin) {
        const tk = themeKey || _spaceTheme(isoSpaceKey);
        const g = _isoWinGeom(w, tk, night);
        const theme = ISO_THEMES[tk] || ISO_THEMES.cozy;
        const out = [];
        _pushIsoWin(out, function () { return [0, 0]; }, 1, theme, night, w, tk, null);
        const k = sc || 1;
        const ml = noMargin ? 0 : Math.round(g.minX * k), mt = noMargin ? 0 : Math.round(g.minY * k);
        return '<svg width="' + Math.round(g.bw * k) + '" height="' + Math.round(g.bh * k) + '" viewBox="' + g.minX + ' ' + g.minY + ' ' + g.bw + ' ' + g.bh + '" style="margin-left:' + ml + 'px;margin-top:' + mt + 'px;display:block;' + (noMargin ? '' : 'overflow:visible;') + '" class="win-svg">' + out.join('') + '</svg>';
    }`, 'win-svg-fn');

// 2) 编辑器窗户元素：显式全尺寸命中盒
rep(`        _isoWinList(isoSpaceKey).forEach(function (w) {
            const el = document.createElement('div');
            el.className = 'iso-win-item' + (w.id === isoSelId ? ' iso-selected' : '');
            el.dataset.id = w.id;
            el.style.left = (OX + (w.wall === 'left' ? -w.gx : w.gx) * 32) + 'px';
            el.style.top = (OY + w.gx * 16) + 'px';
            el.style.zIndex = 2 + Math.round(w.gx);
            el.innerHTML = _isoWinSVGHTML(w, tk, night, 1);
            world.appendChild(el);
        });`,
`        _isoWinList(isoSpaceKey).forEach(function (w) {
            const el = document.createElement('div');
            el.className = 'iso-win-item' + (w.id === isoSelId ? ' iso-selected' : '');
            el.dataset.id = w.id;
            const g = _isoWinGeom(w, tk, night);
            el.style.left = (OX + (w.wall === 'left' ? -w.gx : w.gx) * 32 + g.minX) + 'px';
            el.style.top = (OY + w.gx * 16 + g.minY) + 'px';
            el.style.width = g.bw + 'px';
            el.style.height = g.bh + 'px';
            el.style.zIndex = 2 + Math.round(w.gx);
            el.innerHTML = _isoWinSVGHTML(w, tk, night, 1, true);
            world.appendChild(el);
        });`, 'win-els-box');

// 3) 拖拽：记住几何偏移，移动时对齐全盒
rep(`        isoWinDrag = { id: w.id, el: el, w: w, sx: ev.clientX, sy: ev.clientY, moved: false };`,
`        isoWinDrag = { id: w.id, el: el, w: w, sx: ev.clientX, sy: ev.clientY, moved: false, geom: _isoWinGeom(w, _spaceTheme(isoSpaceKey), !!isoState.night) };`, 'win-drag-geom');

rep(`        isoWinDrag.el.style.left = (_isoSpaceOX[isoSpaceKey] + (wall === 'left' ? -v : v) * 32) + 'px';
        isoWinDrag.el.style.top = (_isoSpaceOY[isoSpaceKey] + v * 16) + 'px';`,
`        const gm = isoWinDrag.geom || { minX: 0, minY: 0 };
        isoWinDrag.el.style.left = (_isoSpaceOX[isoSpaceKey] + (wall === 'left' ? -v : v) * 32 + gm.minX) + 'px';
        isoWinDrag.el.style.top = (_isoSpaceOY[isoSpaceKey] + v * 16 + gm.minY) + 'px';`, 'win-move-geom');

fs.writeFileSync(FILE, c, 'utf8');
console.log('✓ 窗户命中区修正 ' + applied + ' 处完成');
