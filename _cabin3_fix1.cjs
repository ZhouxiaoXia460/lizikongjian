// 小屋 3.0 修复：左栏光影键移到顶部（避免与家具库 FAB 重叠）+ 家具库 SVG 穿透
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
let n = 0;
const CRLF = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
function rep(oldStr, newStr, tag) {
    const tries = [oldStr, CRLF(oldStr), oldStr.replace(/\r\n/g, '\n')];
    const newTries = [newStr, CRLF(newStr), newStr.replace(/\r\n/g, '\n')];
    for (let k = 0; k < tries.length; k++) {
        if (html.includes(tries[k]) && html.split(tries[k]).length === 2) {
            html = html.replace(tries[k], newTries[Math.min(k, newTries.length - 1)]);
            n++; console.log('✓ ' + tag + (k ? ' (行尾变体' + k + ')' : ''));
            return;
        }
    }
    console.error('✗ 未找到: ' + tag); process.exit(1);
}

// 1. 左栏顺序：光影开关/调整 放最上（顶部固定可见），缩放控件随后
rep(
`                    <div class="iso-rail-left">
                        <button onclick="isoZoomBtn(1.25)" class="iso-rail-btn" title="放大">＋</button>
                        <div class="iso-zoom-wrap"><input id="isoZoomRange" type="range" min="0.5" max="2.2" step="0.01" oninput="isoZoomSlider(this.value)"></div>
                        <button onclick="isoZoomBtn(0.8)" class="iso-rail-btn" title="缩小">−</button>
                        <button onclick="fitIsoViewBtn()" class="iso-rail-btn" title="适配全层">⛶</button>
                        <div class="iso-rail-sep"></div>
                        <button id="isoNightBtn2" onclick="toggleIsoNight()" class="iso-rail-btn" title="光影开关：白天/夜晚">☀️</button>
                        <button onclick="openIsoLight()" class="iso-rail-btn" title="光影调整">🎚️</button>
                    </div>`,
`                    <div class="iso-rail-left">
                        <button id="isoNightBtn2" onclick="toggleIsoNight()" class="iso-rail-btn" title="光影开关：白天/夜晚">☀️</button>
                        <button onclick="openIsoLight()" class="iso-rail-btn" title="光影调整">🎚️</button>
                        <div class="iso-rail-sep"></div>
                        <button onclick="isoZoomBtn(1.25)" class="iso-rail-btn" title="放大">＋</button>
                        <div class="iso-zoom-wrap"><input id="isoZoomRange" type="range" min="0.5" max="2.2" step="0.01" oninput="isoZoomSlider(this.value)"></div>
                        <button onclick="isoZoomBtn(0.8)" class="iso-rail-btn" title="缩小">−</button>
                        <button onclick="fitIsoViewBtn()" class="iso-rail-btn" title="适配全层">⛶</button>
                    </div>`,
'左栏光影键置顶');

// 2. 家具库图标不拦截点击（高 SVG 会遮住相邻按钮的点击）
rep(
`        .iso-pal .furn-svg { filter: none; }`,
`        .iso-pal .furn-svg { filter: none; }
        .iso-pal svg { pointer-events: none; }`,
'家具库 SVG 穿透');

fs.writeFileSync('index.html', html, 'utf8');
console.log('修复完成，共 ' + n + ' 处 ✓');
