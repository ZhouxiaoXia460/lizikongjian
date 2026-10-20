// 小屋 3.0 CSS 注入补丁：在 iso-act-btn 区块后追加新组件样式
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');

const anchor = '        #isoLibFab { display: none; }\r\n        #gameRoomPage { overscroll-behavior: contain; }';
if (!html.includes(anchor)) { console.error('CSS 锚点未找到'); process.exit(1); }

const css = [
'        /* —— 小屋 3.0：左缩放滑杆 / 右功能列 / 光影面板 / 方案面板 / 相册 —— */',
'        .iso-rail-left, .iso-rail-right { position: absolute; top: 12px; display: flex; flex-direction: column; gap: 8px; z-index: 30; align-items: center; }',
'        .iso-rail-left { left: 10px; }',
'        .iso-rail-right { right: 10px; }',
'        .iso-rail-btn { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.93); border: 2px solid #F5DEC2; box-shadow: 0 4px 12px rgba(94,58,32,0.14); font-size: 18px; line-height: 1; cursor: pointer; transition: transform .12s ease, border-color .15s; display: flex; align-items: center; justify-content: center; }',
'        .iso-rail-btn:active { transform: scale(0.86); }',
'        .iso-rail-btn.on { border-color: #8BC34A; background: linear-gradient(135deg, #E8F5E1, #EAF7E0); }',
'        .iso-rail-btn.warn.on { border-color: #E8836F; background: linear-gradient(135deg, #FFE9E2, #FFF3EF); }',
'        .iso-zoom-wrap { position: relative; width: 42px; height: 128px; margin: 2px 0; }',
'        .iso-zoom-wrap input[type=range] { position: absolute; width: 128px; left: -43px; top: 47px; transform: rotate(-90deg); height: 42px; margin: 0; accent-color: #D9A56E; cursor: pointer; }',
'        .iso-rail-sep { width: 26px; height: 2px; border-radius: 2px; background: #F0DFC8; margin: 3px 0; }',
'        #gameRoomPage.iso-focus .iso-rail-left, #gameRoomPage.iso-focus .iso-rail-right { display: none; }',
'        #isoViewport.iso-recycle { outline: 3px dashed #E8836F; outline-offset: -6px; }',
'        #isoViewport.iso-recycle .furn-item { cursor: crosshair; }',
'        #isoViewport.iso-recycle .furn-item:hover .furn-svg { filter: drop-shadow(0 0 6px rgba(232, 131, 111, 0.95)); }',
'        .iso-big-check { min-width: 88px; padding: 8px 16px; border-radius: 999px; border: none; background: linear-gradient(135deg, #9ED36A, #7CBF4E); color: #fff; font-size: 13px; font-weight: 800; box-shadow: 0 6px 16px rgba(124, 191, 78, 0.35); cursor: pointer; transition: transform .12s ease; }',
'        .iso-big-check:active { transform: scale(0.92); }',
'        .iso-sheet-mask { position: fixed; inset: 0; background: rgba(62, 40, 20, 0.42); z-index: 9998; display: flex; align-items: flex-end; justify-content: center; padding: 0; }',
'        .iso-sheet { background: #FFFDF8; border: 2px solid #F5DEC2; border-bottom: none; border-radius: 24px 24px 0 0; width: 100%; max-width: 520px; max-height: 82vh; overflow-y: auto; padding: 16px 16px 26px; box-shadow: 0 -12px 40px rgba(62, 40, 20, 0.25); -webkit-overflow-scrolling: touch; }',
'        .iso-sheet-grab { width: 44px; height: 5px; border-radius: 5px; background: #EAD9B8; margin: 0 auto 12px; }',
'        .iso-plan-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 16px; border: 2px solid #F5DEC2; background: #fff; margin-bottom: 8px; cursor: pointer; transition: all .15s; }',
'        .iso-plan-card.active { border-color: #D9A56E; background: linear-gradient(135deg, #FFF4E5, #FFFBF5); }',
'        .iso-plan-card .pc-btn { flex-shrink: 0; width: 34px; height: 34px; border-radius: 12px; border: 1.5px solid #F5DEC2; background: #FFF9F0; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; }',
'        .iso-plan-card .pc-btn:hover { border-color: #D9A56E; background: #FFF4E5; }',
'        .iso-chip-btn { font-size: 12px; font-weight: 700; padding: 7px 13px; border-radius: 999px; border: 1.5px solid #F5DEC2; background: #fff; color: #85532E; cursor: pointer; transition: all .15s; }',
'        .iso-chip-btn:active { transform: scale(0.93); }',
'        .iso-chip-btn.on { border-color: #8BC34A; background: linear-gradient(135deg, #EDF7E4, #F4FAEC); color: #3F7A26; }',
'        .iso-lite-row { display: flex; align-items: center; gap: 8px; margin: 10px 0; }',
'        .iso-lite-row input[type=range] { flex: 1; accent-color: #D9A56E; height: 30px; margin: 0; }',
'        .iso-album-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }',
'        .iso-album-grid img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 12px; border: 2px solid #F5DEC2; cursor: pointer; background: #FFF4E5; }',
'        .iso-house-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 18px; border: 2px solid #F5DEC2; background: #fff; margin-bottom: 8px; cursor: pointer; transition: all .15s; text-align: left; }',
'        .iso-house-card.active { border-color: #D9A56E; background: linear-gradient(135deg, #FFF4E5, #FFFBF5); box-shadow: 0 6px 18px rgba(217, 165, 110, 0.22); }',
'        .iso-house-card .hc-ico { width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg, #FFF4E5, #FFE9EE); display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }',
'        #homeCabinCard { position: relative; border-radius: 20px; overflow: hidden; border: 2px solid #F5DEC2; cursor: pointer; box-shadow: 0 8px 24px rgba(94, 58, 32, 0.10); transition: transform .15s ease; }',
'        #homeCabinCard:active { transform: scale(0.985); }',
'        #homeCabinCard .hcc-label { position: absolute; left: 12px; bottom: 10px; z-index: 3; display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: rgba(255, 253, 248, 0.92); border: 1.5px solid #F5DEC2; font-size: 12px; font-weight: 700; color: #5E3A20; }',
'    @media (max-width: 639px) {',
'        .iso-rail-left { left: 6px; } .iso-rail-right { right: 6px; }',
'        .iso-rail-btn { width: 38px; height: 38px; font-size: 16px; }',
'        .iso-zoom-wrap { width: 38px; height: 110px; }',
'        .iso-zoom-wrap input[type=range] { width: 110px; left: -36px; top: 41px; }',
'    }',
''
].join('\r\n');

html = html.replace(anchor, css + anchor);
fs.writeFileSync(file, html, 'utf8');
console.log('CSS 注入完成 ✓');
