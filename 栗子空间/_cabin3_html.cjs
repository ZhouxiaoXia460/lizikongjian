// 小屋 3.0 HTML 结构补丁
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let n = 0;
const CRLF = (s) => s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'); // 统一转 CRLF（磁盘行尾）
function rep(oldStr, newStr, tag) {
    oldStr = CRLF(oldStr); newStr = CRLF(newStr);
    if (!html.includes(oldStr)) { console.error('✗ 未找到: ' + tag); process.exit(1); }
    if (html.split(oldStr).length > 2) { console.error('✗ 不唯一: ' + tag); process.exit(1); }
    html = html.replace(oldStr, newStr);
    n++;
    console.log('✓ ' + tag);
}

// ============ 1. 总览页头部重构 ============
rep(
`                <div class="flex items-center justify-between mb-3">
                    <button onclick="closeGamePage()" class="text-[#85532E] text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#FFF4E5] transition-colors">← 返回</button>
                    <span class="font-semibold text-[#5E3A20]">🏠 我的等距小屋</span>
                    <div class="flex gap-1.5">
                        <button id="isoNightBtn" onclick="toggleIsoNight()" class="iso-theme-btn">🌙 夜晚</button>
                        <button onclick="exportIsoShot()" class="iso-theme-btn">📸 截图</button>
                    </div>
                </div>`,
`                <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <button onclick="closeGamePage()" class="text-[#85532E] text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#FFF4E5] transition-colors">← 返回</button>
                    <span class="font-semibold text-[#5E3A20]">🏠 我的小屋</span>
                    <div class="flex gap-1.5 flex-wrap justify-end">
                        <button id="isoNightBtn" onclick="toggleIsoNight()" class="iso-theme-btn">🌙 夜晚</button>
                        <button onclick="openIsoLight()" class="iso-theme-btn">🎚 光影</button>
                        <button onclick="openIsoShotMenu()" class="iso-theme-btn">📸 快照</button>
                        <button onclick="openIsoHouses()" class="iso-theme-btn">🚚 搬家</button>
                        <button onclick="openIsoPlans()" class="iso-theme-btn">📁 方案</button>
                    </div>
                </div>`,
'总览页头部');

// 移除成就行
rep(
`                <div id="isoAwardsRow" class="flex gap-1.5 justify-center flex-wrap mb-2"></div>
`,
'', '移除总览成就行');

rep(
`                <p class="text-center text-[10px] text-[#B08968] mt-3">点房间去布置 · 点上方标签可隐藏/显示楼层 · 一栋双层主楼 + 副楼共享一片小院 🎀</p>`,
`                <p class="text-center text-[10px] text-[#B08968] mt-3">点房间去布置 · 点上方标签可隐藏/显示楼层 · 🚚 搬家随时换户型 · 📁 方案随便存 · 全家具已解锁 🎀</p>`,
'总览页提示');

// ============ 2. 编辑器整块重构（从 isoEditView 开始到 isoLib 结束） ============
const editStart = html.indexOf('            <div id="isoEditView" class="hidden">');
const editEndAnchor = `                <p class="text-center text-[10px] text-[#B08968] mt-3">🖱 滚轮缩放 · 📱 双指缩放 / 单指平移 / 点选家具弹底部操作栏 / 长按更多操作 · R 旋转 · 右键菜单：旋转/复制/开关/收起 · 靠墙自动贴齐 · 布置自动保存在本机</p>`;
const editEnd = html.indexOf(editEndAnchor);
if (editStart < 0 || editEnd < 0 || editEnd <= editStart) { console.error('✗ 编辑器区块定位失败'); process.exit(1); }
const editEndLen = editEndAnchor.length;
const newEdit = `            <div id="isoEditView" class="hidden">
                <div id="isoFocusHide">
                    <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <button onclick="closeIsoEdit()" class="text-[#85532E] text-sm font-medium px-3 py-2 rounded-xl hover:bg-[#FFF4E5] transition-colors">← 全屋</button>
                        <span class="text-xs font-semibold text-[#B08968] hidden sm:inline">🛋 自由布置 · 自动保存在本机</span>
                        <button onclick="openIsoPlans()" class="iso-big-check">✓ 保存方案</button>
                    </div>
                    <div id="isoSpaceTabs" class="flex gap-2 mb-2 flex-wrap"></div>
                    <div class="flex gap-1.5 mb-2 flex-wrap items-center">
                        <button onclick="isoUndo()" class="iso-chip-btn">↩️ 撤销</button>
                        <button onclick="isoRedo()" class="iso-chip-btn">↪️ 重做</button>
                        <button id="isoSnapBtn" onclick="isoToggleSnap()" class="iso-chip-btn on">🧲 吸附</button>
                        <button onclick="applyIsoSample()" class="iso-chip-btn">✨ 样板间</button>
                        <button id="isoPalsBtn" onclick="toggleIsoPals()" class="iso-chip-btn">🚶 小人</button>
                        <button id="isoFocusBtn" onclick="toggleIsoFocus()" class="iso-chip-btn">🎯 专注</button>
                    </div>
                    <div id="isoThemeRow" class="flex gap-2 mb-2 flex-wrap items-center"></div>
                </div>
                <div id="isoViewport">
                    <div id="isoWorld"></div>
                    <button id="isoFocusExit" onclick="toggleIsoFocus()" class="hidden absolute left-3 top-3 px-3 py-2 rounded-xl bg-white/95 border border-[#F5DEC2] shadow-md text-xs font-semibold text-[#85532E] active:scale-95 transition-transform">✕ 退出专注</button>
                    <div class="iso-rail-left">
                        <button onclick="isoZoomBtn(1.25)" class="iso-rail-btn" title="放大">＋</button>
                        <div class="iso-zoom-wrap"><input id="isoZoomRange" type="range" min="0.5" max="2.2" step="0.01" oninput="isoZoomSlider(this.value)"></div>
                        <button onclick="isoZoomBtn(0.8)" class="iso-rail-btn" title="缩小">−</button>
                        <button onclick="fitIsoViewBtn()" class="iso-rail-btn" title="适配全层">⛶</button>
                        <div class="iso-rail-sep"></div>
                        <button id="isoNightBtn2" onclick="toggleIsoNight()" class="iso-rail-btn" title="光影开关：白天/夜晚">☀️</button>
                        <button onclick="openIsoLight()" class="iso-rail-btn" title="光影调整">🎚️</button>
                    </div>
                    <div class="iso-rail-right">
                        <button onclick="isoAllRecycle()" class="iso-rail-btn" title="全部回收：清空本房间">📦</button>
                        <button id="isoRecycleBtn" onclick="isoRecycleToggle()" class="iso-rail-btn warn" title="回收摆件：开启后点家具即收回">♻️</button>
                        <button onclick="openIsoPlans()" class="iso-rail-btn" title="装修方案">📁</button>
                        <button onclick="openIsoHouses()" class="iso-rail-btn" title="搬家：切换户型">🚚</button>
                        <button onclick="isoGotoGarden()" class="iso-rail-btn" title="我的花园">🌿</button>
                    </div>
                    <button id="isoLibFab" onclick="toggleIsoLib()" class="absolute left-3 bottom-3 w-12 h-12 rounded-2xl bg-white/95 border-2 border-[#F5DEC2] shadow-md text-xl active:scale-95 transition-transform" style="z-index:30;">🪑</button>
                    <div id="isoItemBar" class="hidden absolute left-1/2 bottom-3 items-center gap-1 bg-white/95 border-2 border-[#F5DEC2] rounded-full shadow-lg p-1" style="z-index:35; transform:translateX(-50%); max-width: calc(100% - 120px); overflow-x: auto;">
                        <span id="isoItemSelected" class="text-xs font-bold text-[#5E3A20] pl-2 pr-1 whitespace-nowrap"></span>
                        <button id="isoItemToggle" onclick="isoToggleSelected()" class="hidden iso-act-btn">💡</button>
                        <button onclick="isoScaleSelected(-1)" class="iso-act-btn" title="缩小一点">➖</button>
                        <button onclick="isoScaleSelected(1)" class="iso-act-btn" title="放大一点">➕</button>
                        <button onclick="isoCopySelected()" class="iso-act-btn" title="复制一件">📋</button>
                        <button onclick="isoRotateSelected()" class="iso-act-btn" title="旋转 90°">🔄</button>
                        <button onclick="isoRemoveSelected()" class="iso-act-btn" title="收起" style="color:#C2543A;">🗑</button>
                    </div>
                </div>
                <div id="isoLib" class="mt-3 bg-white border border-[#F5DEC2] rounded-2xl overflow-hidden">
                    <button onclick="toggleIsoLib()" class="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[#5E3A20] hover:bg-[#FFF4E5] transition-colors">
                        <span>🪑 家具库（全解锁 · 按住家具拖进房间 / 点击拿起）</span>
                        <span id="isoLibChevron" class="transition-transform">▾</span>
                    </button>
                    <div id="isoLibBody" class="px-3 pb-3">
                        <div id="isoComboRow" class="flex gap-1.5 mb-2 flex-wrap items-center pt-2"></div>
                        <div id="isoLibTabs" class="flex gap-1.5 mb-2 flex-wrap"></div>
                        <div id="isoLibItems" class="grid grid-cols-6 sm:grid-cols-10 gap-2"></div>
                    </div>
                </div>
                <p class="text-center text-[10px] text-[#B08968] mt-3">🖱 滚轮缩放 · 📱 双指缩放 / 单指平移 / 点家具弹操作栏 · R 旋转 · ♻️ 开启后点击即回收 · 布置自动保存在本机 · 断网也能玩</p>`;
html = html.slice(0, editStart) + newEdit + html.slice(editEnd + editEndLen);
n++;
console.log('✓ 编辑器整块重构');

// ============ 3. 首页小屋卡片容器 ============
rep(
`            <div class="grid grid-cols-5 gap-2 mb-6 fade-in-up fade-in-up-delay-2">
                <div onclick="switchTab('chat')" class="home-icon-btn flex flex-col items-center gap-2 cursor-pointer p-1 rounded-2xl">`,
`            <div id="homeCabinCard" class="mb-6 hidden fade-in-up fade-in-up-delay-1"></div>

            <div class="grid grid-cols-5 gap-2 mb-6 fade-in-up fade-in-up-delay-2">
                <div onclick="switchTab('chat')" class="home-icon-btn flex flex-col items-center gap-2 cursor-pointer p-1 rounded-2xl">`,
'首页小屋卡片容器');

// ============ 4. 设置页启动直达开关 ============
rep(
`                    <button type="button" onclick="cycleDarkMode()" id="darkModeBtn" class="text-xs font-semibold text-[#85532E] bg-[#FFF4E5] border border-[#F5DEC2] px-3 py-1.5 rounded-full active:scale-95 transition-transform">跟随系统</button>
                </div>
            </div>`,
`                    <button type="button" onclick="cycleDarkMode()" id="darkModeBtn" class="text-xs font-semibold text-[#85532E] bg-[#FFF4E5] border border-[#F5DEC2] px-3 py-1.5 rounded-full active:scale-95 transition-transform">跟随系统</button>
                </div>
                <div class="p-4 flex items-center justify-between border-t border-[#FFF4E5]">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">🌸</span>
                        <div>
                            <p class="text-sm font-medium text-[#5E3A20]">启动直达我的小屋</p>
                            <p class="text-xs text-[#B08968] mt-0.5">打开栗子空间直接进入小屋</p>
                        </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="settingCabinStartupCheck" onchange="toggleIsoStartup(this.checked)" class="sr-only peer">
                        <div class="w-12 h-7 bg-[#F5DEC2] rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-[3px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-sm peer-checked:bg-gradient-to-r peer-checked:from-[#D9A56E] peer-checked:to-[#A66D3A]"></div>
                    </label>
                </div>
            </div>`,
'设置页启动开关');

// ============ 5. 游戏中心入口文案 ============
rep(
`                        <p class="text-sm font-semibold text-[#5E3A20]">少女小屋</p>
                        <p class="text-[10px] text-[#B08968]">两层小屋 · 家具会自己动 · 拖拽叠加</p>`,
`                        <p class="text-sm font-semibold text-[#5E3A20]">我的小屋</p>
                        <p class="text-[10px] text-[#B08968]">自由装修 · 搬家换户型 · 光影与花园</p>`,
'游戏中心入口文案');

fs.writeFileSync(file, html, 'utf8');
console.log('HTML 补丁完成，共 ' + n + ' 处 ✓');
