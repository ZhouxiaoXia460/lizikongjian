// 小屋 3.0 JS 补丁 C：新功能面板（方案/搬家/光影/快照/相册/首页卡片/启动直达）
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

// ============ 1. 新功能模块（插在 Q版小人 区块前） ============
rep(
`    // —— Q版小人：在编辑器房间里溜达，会坐沙发/椅子，夜晚回床上睡觉（💤） ——`,
`    // ======================================================================
    // 🏠 小屋 3.0 新功能：装修方案面板 / 搬家面板 / 光影面板 / 快照菜单 / 小屋相册 / 首页卡片 / 启动直达
    // ======================================================================

    // —— 装修方案面板 ——
    const ISO_LIGHT_PRESETS = [
        { key: 'morning', label: '🌅 清晨', night: false, bright: 0.66, warm: 0.34 },
        { key: 'noon', label: '☀️ 午后', night: false, bright: 0.78, warm: 0.5 },
        { key: 'dusk', label: '🌇 傍晚', night: false, bright: 0.46, warm: 0.85 },
        { key: 'night', label: '🌌 深夜', night: true, bright: 0.3, warm: 0.62 }
    ];
    function _planItemCount(p) {
        try { return Object.keys(p.spaces || {}).reduce(function (s, k) { return s + ((p.spaces[k] || {}).items || []).length; }, 0); } catch (e) { return 0; }
    }
    function openIsoPlans() {
        let mask = document.getElementById('isoPlansMask'); if (mask) mask.remove();
        mask = document.createElement('div');
        mask.className = 'iso-sheet-mask'; mask.id = 'isoPlansMask';
        mask.innerHTML = '<div class="iso-sheet">' +
            '<div class="iso-sheet-grab"></div>' +
            '<div class="flex items-center justify-between mb-1"><span class="font-bold text-[#5E3A20]">📁 装修方案</span>' +
            '<button onclick="closeIsoPlans()" class="iso-chip-btn">关闭</button></div>' +
            '<p class="text-[11px] text-[#B08968] mb-3">想存几套存几套 · 换设备前记得「导出」备份 JSON（数据只在本机）</p>' +
            '<div id="isoPlanList"></div>' +
            '<div class="mt-3 p-3 rounded-2xl border border-dashed border-[#E8D5B0] bg-[#FFFBF5]">' +
            '<p class="text-xs font-bold text-[#5E3A20] mb-2">💾 把当前布置存为新方案</p>' +
            '<input id="isoPlanName" placeholder="方案名（如：奶油风周末）" class="w-full px-3 py-2 mb-2 rounded-xl bg-white text-xs border border-[#F5DEC2] outline-none">' +
            '<input id="isoPlanNote" placeholder="备注（可选，如：深夜氛围 / 给TA的惊喜）" class="w-full px-3 py-2 mb-2 rounded-xl bg-white text-xs border border-[#F5DEC2] outline-none">' +
            '<div class="flex gap-2 flex-wrap">' +
            '<button onclick="isoPlanSaveNew()" class="iso-chip-btn on flex-1">💾 保存为新方案</button>' +
            '<button onclick="document.getElementById(\\'isoPlanImportFile\\').click()" class="iso-chip-btn">📥 导入</button>' +
            '<input type="file" id="isoPlanImportFile" accept=".json,application/json" class="hidden" onchange="isoPlanImport(this)">' +
            '</div></div></div>';
        mask.addEventListener('click', function (e) { if (e.target === mask) closeIsoPlans(); });
        document.body.appendChild(mask);
        _renderIsoPlanList();
    }
    function closeIsoPlans() { const m = document.getElementById('isoPlansMask'); if (m) m.remove(); }
    function _renderIsoPlanList() {
        const listEl = document.getElementById('isoPlanList');
        if (!listEl) return;
        const plans = _isoPlans();
        listEl.innerHTML = plans.length ? plans.map(function (p) {
            const home = isoState.homePlanId === p.id;
            return '<div class="iso-plan-card ' + (p.id === isoState.activePlanId ? 'active' : '') + '">' +
                '<div class="flex-1 min-w-0" onclick="isoPlanLoad(\\'' + p.id + '\\')">' +
                '<p class="text-sm font-bold text-[#5E3A20] truncate">' + _isoEsc(p.name || '未命名') + (p.id === isoState.activePlanId ? ' <span class="text-[10px] text-[#3B8C3B]">当前</span>' : '') + (home ? ' <span class="text-[10px] text-[#D9A56E]">⭐主页</span>' : '') + '</p>' +
                '<p class="text-[10px] text-[#B08968] truncate">' + _isoEsc(p.note || '') + ' · ' + ((ISO_HOUSES.find(h => h.key === p.houseKey) || ISO_HOUSES[0]).label) + ' · ' + _planItemCount(p) + ' 件 · ' + new Date(p.at || Date.now()).toLocaleDateString() + '</p>' +
                '</div>' +
                '<button class="pc-btn" title="重命名/备注" onclick="isoPlanRename(\\'' + p.id + '\\')">✏️</button>' +
                '<button class="pc-btn" title="用当前布置覆盖" onclick="isoPlanOverwrite(\\'' + p.id + '\\')">🔄</button>' +
                '<button class="pc-btn" title="' + (home ? '取消主界面背景' : '设为主界面背景') + '" onclick="isoPlanSetHome(\\'' + p.id + '\\')">' + (home ? '⭐' : '☆') + '</button>' +
                '<button class="pc-btn" title="导出 JSON 备份" onclick="isoPlanExport(\\'' + p.id + '\\')">📤</button>' +
                '<button class="pc-btn" title="删除" onclick="isoPlanDelete(\\'' + p.id + '\\')">🗑</button>' +
                '</div>';
        }).join('') : '<p class="text-xs text-[#B08968] text-center py-4">还没有保存的方案，先布置一间小屋吧 🌸</p>';
    }
    function isoPlanSaveNew() {
        const nameEl = document.getElementById('isoPlanName'), noteEl = document.getElementById('isoPlanNote');
        const name = (nameEl && nameEl.value.trim()) || ('方案 ' + new Date().toLocaleDateString());
        const note = (noteEl && noteEl.value.trim()) || '';
        isoState.plans.push({
            id: 'plan_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            name: name, note: note,
            spaces: JSON.parse(JSON.stringify(isoState.spaces)),
            theme: isoState.theme, houseKey: isoState.houseKey, night: isoState.night,
            light: JSON.parse(JSON.stringify(isoState.light || { bright: 0.5, warm: 0.5 })),
            at: Date.now()
        });
        isoState.activePlanId = isoState.plans[isoState.plans.length - 1].id;
        if (nameEl) nameEl.value = ''; if (noteEl) noteEl.value = '';
        _isoSave(); _renderIsoPlanList(); _renderIsoLayoutRow();
        showToast('💾 已保存方案「' + name + '」');
    }
    function _isoApplyPlan(p, silent) {
        isoPushUndo();
        isoState.houseKey = ISO_HOUSES.some(h => h.key === p.houseKey) ? p.houseKey : isoState.houseKey;
        isoState.theme = ISO_THEMES[p.theme] ? p.theme : isoState.theme;
        isoState.night = !!p.night;
        if (p.light) isoState.light = { bright: (p.light.bright === undefined ? 0.5 : p.light.bright), warm: (p.light.warm === undefined ? 0.5 : p.light.warm) };
        if (p.spaces) {
            isoState.spaces = JSON.parse(JSON.stringify(p.spaces));
            Object.keys(ISO_SPACES).forEach(k => { if (!isoState.spaces[k] || !Array.isArray(isoState.spaces[k].items)) isoState.spaces[k] = { items: [] }; });
        }
        isoState.activePlanId = p.id;
        isoSelId = null; heldClear();
        _isoSave();
        closeIsoPlans();
        if (isoEditOpen) {
            if (_isoHouseSpaces().indexOf(isoSpaceKey) < 0) isoSpaceKey = _isoHouseSpaces()[0];
            _renderIsoTabs(); _renderIsoThemeRow(); _renderIsoLayoutRow(); _renderIsoLib();
            isoLibCat = _defaultLibCatFor(isoSpaceKey);
            _renderIsoSpace(true);
            _updateIsoNightBtns();
        } else {
            _showIsoHouse();
        }
        if (!silent) showToast('📂 已加载方案「' + (p.name || '未命名') + '」');
    }
    function isoPlanLoad(id) {
        const p = _isoPlans().find(x => x.id === id);
        if (p) _isoApplyPlan(p, id === isoState.activePlanId);
        _renderIsoPlanList();
    }
    function isoPlanOverwrite(id) {
        const p = _isoPlans().find(x => x.id === id); if (!p) return;
        if (!confirm('用当前布置覆盖方案「' + (p.name || '未命名') + '」吗？')) return;
        p.spaces = JSON.parse(JSON.stringify(isoState.spaces));
        p.theme = isoState.theme; p.houseKey = isoState.houseKey; p.night = isoState.night;
        p.light = JSON.parse(JSON.stringify(isoState.light || { bright: 0.5, warm: 0.5 }));
        p.at = Date.now();
        _isoSave(); _renderIsoPlanList(); _renderIsoLayoutRow();
        showToast('🔄 已覆盖保存「' + (p.name || '未命名') + '」');
    }
    function isoPlanRename(id) {
        const p = _isoPlans().find(x => x.id === id); if (!p) return;
        const name = prompt('方案名称：', p.name || '');
        if (name === null) return;
        const note = prompt('方案备注（可留空）：', p.note || '');
        if (note === null) return;
        p.name = name.trim() || p.name; p.note = note.trim(); p.at = Date.now();
        _isoSave(); _renderIsoPlanList(); _renderIsoLayoutRow();
        showToast('✏️ 方案信息已更新');
    }
    function isoPlanDelete(id) {
        const p = _isoPlans().find(x => x.id === id); if (!p) return;
        if (!confirm('删除方案「' + (p.name || '未命名') + '」？（不影响当前布置）')) return;
        isoState.plans = isoState.plans.filter(x => x.id !== id);
        if (isoState.homePlanId === id) isoState.homePlanId = null;
        if (isoState.activePlanId === id) isoState.activePlanId = (isoState.plans[0] || {}).id || null;
        _isoSave(); _renderIsoPlanList(); _renderIsoLayoutRow();
        showToast('🗑 方案已删除');
    }
    function isoPlanExport(id) {
        const p = _isoPlans().find(x => x.id === id); if (!p) return;
        const blob = new Blob([JSON.stringify({ type: 'lizi-cabin-plan', version: 3, plan: p }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '栗子小屋方案-' + (p.name || '未命名') + '-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        showToast('📤 方案已导出，换个设备也能「📥 导入」找回来');
    }
    function isoPlanImport(input) {
        const f = input.files && input.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function () {
            try {
                const o = JSON.parse(reader.result);
                const p = o && o.plan ? o.plan : o;
                if (!p || !p.spaces) throw new Error('不是小屋方案文件');
                p.id = 'plan_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
                p.name = String(p.name || '导入的方案');
                p.houseKey = ISO_HOUSES.some(h => h.key === p.houseKey) ? p.houseKey : 'loft';
                p.theme = ISO_THEMES[p.theme] ? p.theme : 'cozy';
                if (!p.light) p.light = { bright: 0.5, warm: 0.5 };
                p.at = Date.now();
                isoState.plans.push(p);
                _isoSave(); _renderIsoPlanList(); _renderIsoLayoutRow();
                showToast('📥 已导入方案「' + p.name + '」，点它即可加载');
            } catch (e) { showToast('导入失败：' + e.message); }
            input.value = '';
        };
        reader.readAsText(f);
    }
    function isoPlanSetHome(id) {
        if (isoState.homePlanId === id) {
            isoState.homePlanId = null;
            showToast('⭐ 已取消主界面背景');
        } else {
            isoState.homePlanId = id;
            const p = _isoPlans().find(x => x.id === id);
            showToast('⭐ 「' + (p ? p.name : '方案') + '」已设为个人主页背景');
        }
        _isoSave(); _renderIsoPlanList();
        try { _renderHomeCabinCard(); } catch (e) {}
    }

    // —— 搬家面板：户型切换 ——
    function openIsoHouses() {
        let mask = document.getElementById('isoHousesMask'); if (mask) mask.remove();
        mask = document.createElement('div');
        mask.className = 'iso-sheet-mask'; mask.id = 'isoHousesMask';
        mask.innerHTML = '<div class="iso-sheet">' +
            '<div class="iso-sheet-grab"></div>' +
            '<div class="flex items-center justify-between mb-1"><span class="font-bold text-[#5E3A20]">🚚 搬家 · 选一套户型</span>' +
            '<button onclick="closeIsoHouses()" class="iso-chip-btn">关闭</button></div>' +
            '<p class="text-[11px] text-[#B08968] mb-3">家具跟着空间走：旧户型的房间原样收起，搬回来时一切都在 💝</p>' +
            '<div id="isoHouseList"></div></div>';
        mask.addEventListener('click', function (e) { if (e.target === mask) closeIsoHouses(); });
        document.body.appendChild(mask);
        _renderIsoHouseList();
    }
    function closeIsoHouses() { const m = document.getElementById('isoHousesMask'); if (m) m.remove(); }
    function _renderIsoHouseList() {
        const el = document.getElementById('isoHouseList');
        if (!el) return;
        el.innerHTML = ISO_HOUSES.map(function (h) {
            const cur = h.key === isoState.houseKey;
            const cnt = h.layout.reduce(function (s, lay) { return s + lay.floors.reduce(function (t, k) { return t + (((isoState.spaces[k] || {}).items || []).length); }, 0); }, 0);
            return '<div class="iso-house-card ' + (cur ? 'active' : '') + '" onclick="' + (cur ? '' : 'isoMoveHouse(\\'' + h.key + '\\')') + '">' +
                '<div class="hc-ico">' + h.icon + '</div>' +
                '<div class="flex-1 min-w-0">' +
                '<p class="text-sm font-bold text-[#5E3A20]">' + h.label + (cur ? ' <span class="text-[10px] text-[#3B8C3B]">现在住这里</span>' : '') + '</p>' +
                '<p class="text-[11px] text-[#B08968] mt-0.5">' + h.desc + ' · 已存 ' + cnt + ' 件家具</p>' +
                '</div>' +
                (cur ? '<span class="text-[#3B8C3B] font-bold">✓</span>' : '<span class="text-[#D9A56E] text-xl">›</span>') +
                '</div>';
        }).join('');
    }
    function closeIsoHousesKeep() { }
    function isoMoveHouse(key) {
        const h = ISO_HOUSES.find(x => x.key === key);
        if (!h || key === isoState.houseKey) { closeIsoHouses(); return; }
        if (!confirm('搬到「' + h.label + '」吗？当前户型的家具会原样收起，随时搬回来。')) return;
        isoPushUndo();
        isoState.houseKey = key;
        h.layout.forEach(function (lay) {
            lay.floors.forEach(function (k) {
                if (!isoState.spaces[k] || !Array.isArray(isoState.spaces[k].items)) isoState.spaces[k] = { items: [] };
            });
        });
        const firstFloor = (h.layout.find(l => l.dx === 0) || h.layout[0]).floors[0];
        isoSpaceKey = firstFloor;
        isoSelId = null; heldClear();
        isoLibCat = _defaultLibCatFor(firstFloor);
        _isoSave();
        closeIsoHouses();
        if (isoEditOpen) {
            _renderIsoTabs(); _renderIsoLib(); _renderIsoSpace(true);
        } else {
            _showIsoHouse();
        }
        showToast('🚚 搬进了「' + h.label + '」，开始新布置吧！');
    }

    // —— 光影面板：开关 + 亮度/色温 + 氛围预设 ——
    function openIsoLight() {
        let mask = document.getElementById('isoLightMask'); if (mask) mask.remove();
        mask = document.createElement('div');
        mask.className = 'iso-sheet-mask'; mask.id = 'isoLightMask';
        mask.innerHTML = '<div class="iso-sheet">' +
            '<div class="iso-sheet-grab"></div>' +
            '<div class="flex items-center justify-between mb-1"><span class="font-bold text-[#5E3A20]">🎚 光影调整</span>' +
            '<button onclick="closeIsoLight()" class="iso-chip-btn">关闭</button></div>' +
            '<div class="flex gap-2 flex-wrap mb-3" id="isoLightPresetRow"></div>' +
            '<div class="iso-lite-row"><span class="text-xs font-bold text-[#5E3A20] w-14">☀️ 亮度</span>' +
            '<input type="range" id="isoLightBright" min="0" max="100" step="1" oninput="isoSetLight(\\'bright\\', this.value)">' +
            '<span id="isoLightBrightV" class="text-[10px] text-[#B08968] w-8 text-right"></span></div>' +
            '<div class="iso-lite-row"><span class="text-xs font-bold text-[#5E3A20] w-14">🌡 色温</span>' +
            '<input type="range" id="isoLightWarm" min="0" max="100" step="1" oninput="isoSetLight(\\'warm\\', this.value)">' +
            '<span class="text-[9px] text-[#B08968]">冷 ← → 暖</span></div>' +
            '<div class="flex gap-2 flex-wrap mt-3">' +
            '<button onclick="isoToggleNightFromPanel()" class="iso-chip-btn" id="isoLightNightBtn">🌙</button>' +
            '<button onclick="isoResetLight()" class="iso-chip-btn">↺ 恢复默认</button>' +
            '</div>' +
            '<p class="text-[10px] text-[#B08968] mt-3">清晨 / 午后 / 傍晚 / 深夜，一键切换；亮度色温随心微调，总览与房间同时生效</p>' +
            '</div>';
        mask.addEventListener('click', function (e) { if (e.target === mask) closeIsoLight(); });
        document.body.appendChild(mask);
        _renderIsoLightPanel();
    }
    function closeIsoLight() { const m = document.getElementById('isoLightMask'); if (m) m.remove(); }
    function _renderIsoLightPanel() {
        const L = isoState.light || { bright: 0.5, warm: 0.5 };
        const b = document.getElementById('isoLightBright'); if (b) { b.value = Math.round(L.bright * 100); }
        const w = document.getElementById('isoLightWarm'); if (w) { w.value = Math.round(L.warm * 100); }
        const bv = document.getElementById('isoLightBrightV'); if (bv) bv.textContent = Math.round(L.bright * 100) + '%';
        const nb = document.getElementById('isoLightNightBtn');
        if (nb) { nb.innerHTML = isoState.night ? '☀️ 切白天' : '🌙 切夜晚'; nb.classList.toggle('on', isoState.night); }
        const pr = document.getElementById('isoLightPresetRow');
        if (pr) pr.innerHTML = ISO_LIGHT_PRESETS.map(function (p) {
            const on = !!isoState.night === !!p.night && Math.abs((isoState.light.bright || 0.5) - p.bright) < 0.02 && Math.abs((isoState.light.warm || 0.5) - p.warm) < 0.02;
            return '<button class="iso-chip-btn ' + (on ? 'on' : '') + '" onclick="isoLightPreset(\\'' + p.key + '\\')">' + p.label + '</button>';
        }).join('');
    }
    function isoSetLight(k, v) {
        v = Math.max(0, Math.min(100, parseInt(v, 10) || 50)) / 100;
        isoState.light[k] = v;
        _isoSave();
        _refreshIsoLightViews();
        _renderIsoLightPanel();
    }
    function isoToggleNightFromPanel() { toggleIsoNight(); _renderIsoLightPanel(); }
    function isoLightPreset(key) {
        const p = ISO_LIGHT_PRESETS.find(x => x.key === key);
        if (!p) return;
        isoState.night = !!p.night;
        isoState.light = { bright: p.bright, warm: p.warm };
        _isoSave();
        _updateIsoNightBtns();
        _refreshIsoLightViews(true);
        _renderIsoLightPanel();
        showToast('✨ 已切换到「' + p.label.replace(/[^\\u4e00-\\u9fa5]/g, '') + '」氛围');
    }
    function isoResetLight() {
        isoState.night = false;
        isoState.light = { bright: 0.5, warm: 0.5 };
        _isoSave();
        _updateIsoNightBtns();
        _refreshIsoLightViews(true);
        _renderIsoLightPanel();
        showToast('↺ 光影已恢复默认');
    }
    function _refreshIsoLightViews(keepPanel) {
        if (isoEditOpen) _buildIsoWorld(); else _renderIsoHouse();
    }

    // —— 快照菜单 / 高清导出 / 小屋相册（纯本地） ——
    const ISO_ALBUM_KEY = 'lizi_iso_album_v1';
    function _isoAlbum() { try { return JSON.parse(localStorage.getItem(ISO_ALBUM_KEY)) || []; } catch (e) { return []; } }
    function _isoAlbumSave(arr) {
        while (arr.length > 12) arr.shift();
        try { localStorage.setItem(ISO_ALBUM_KEY, JSON.stringify(arr)); }
        catch (e) { arr.shift(); try { localStorage.setItem(ISO_ALBUM_KEY, JSON.stringify(arr)); } catch (e2) {} }
    }
    function openIsoShotMenu() {
        let mask = document.getElementById('isoShotMask'); if (mask) mask.remove();
        mask = document.createElement('div');
        mask.className = 'iso-sheet-mask'; mask.id = 'isoShotMask';
        mask.innerHTML = '<div class="iso-sheet">' +
            '<div class="iso-sheet-grab"></div>' +
            '<div class="flex items-center justify-between mb-3"><span class="font-bold text-[#5E3A20]">📸 装修快照</span>' +
            '<button onclick="closeIsoShotMenu()" class="iso-chip-btn">关闭</button></div>' +
            '<div class="space-y-2">' +
            '<div class="iso-house-card" onclick="isoShotExport(); closeIsoShotMenu();"><div class="hc-ico">🖼️</div><div class="flex-1"><p class="text-sm font-bold text-[#5E3A20]">导出高清 PNG</p><p class="text-[11px] text-[#B08968] mt-0.5">2 倍清晰度，保存到手机/电脑</p></div><span class="text-[#D9A56E] text-xl">›</span></div>' +
            '<div class="iso-house-card" onclick="isoShotAlbumSave(); closeIsoShotMenu();"><div class="hc-ico">📷</div><div class="flex-1"><p class="text-sm font-bold text-[#5E3A20]">存入小屋相册</p><p class="text-[11px] text-[#B08968] mt-0.5">只存在本机浏览器，最多 12 张</p></div><span class="text-[#D9A56E] text-xl">›</span></div>' +
            '<div class="iso-house-card" onclick="openIsoAlbum(); closeIsoShotMenu();"><div class="hc-ico">🗂️</div><div class="flex-1"><p class="text-sm font-bold text-[#5E3A20]">打开小屋相册</p><p class="text-[11px] text-[#B08968] mt-0.5">查看 / 下载 / 删除快照</p></div><span class="text-[#D9A56E] text-xl">›</span></div>' +
            '</div></div>';
        mask.addEventListener('click', function (e) { if (e.target === mask) closeIsoShotMenu(); });
        document.body.appendChild(mask);
    }
    function closeIsoShotMenu() { const m = document.getElementById('isoShotMask'); if (m) m.remove(); }
    function isoShotExport() { exportIsoShot(); }
    function _isoShotCanvas(cb) {
        const svg = isoEditOpen ? _editorRoomSvg() : _lastOverviewSvg;
        if (!svg) { showToast('暂时无法生成快照，请先打开小屋'); return; }
        try {
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = function () {
                try {
                    const c = document.createElement('canvas');
                    c.width = img.width; c.height = img.height;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = isoState.night ? '#323763' : '#FDF6EC';
                    ctx.fillRect(0, 0, c.width, c.height);
                    ctx.drawImage(img, 0, 0, c.width, c.height);
                    URL.revokeObjectURL(url);
                    cb(c);
                } catch (e) { showToast('快照失败：' + e.message); }
            };
            img.onerror = function () { URL.revokeObjectURL(url); showToast('快照失败，请重试'); };
            img.src = url;
        } catch (e) { showToast('快照失败：' + e.message); }
    }
    function isoShotAlbumSave() {
        _isoShotCanvas(function (c) {
            try {
                const scale = Math.min(1, 560 / c.width);
                const c2 = document.createElement('canvas');
                c2.width = Math.round(c.width * scale); c2.height = Math.round(c.height * scale);
                c2.getContext('2d').drawImage(c, 0, 0, c2.width, c2.height);
                const src = c2.toDataURL('image/jpeg', 0.78);
                const arr = _isoAlbum();
                arr.unshift({
                    id: 'al_' + Date.now(),
                    name: (isoEditOpen ? ((ISO_SPACES[isoSpaceKey] || {}).name || '房间') : '全屋总览') + ' ' + new Date().toLocaleDateString(),
                    at: Date.now(), src: src
                });
                _isoAlbumSave(arr);
                showToast('📷 已存入小屋相册（本机保存）');
            } catch (e) { showToast('保存失败：' + e.message); }
        });
    }
    function exportIsoShot() {
        _isoShotCanvas(function (c) {
            try {
                const scale = 2;
                const c2 = document.createElement('canvas');
                c2.width = c.width * scale; c2.height = c.height * scale;
                const ctx = c2.getContext('2d');
                ctx.fillStyle = isoState.night ? '#323763' : '#FDF6EC';
                ctx.fillRect(0, 0, c2.width, c2.height);
                ctx.drawImage(c, 0, 0, c2.width, c2.height);
                const a = document.createElement('a');
                a.download = '栗子小屋-' + (isoEditOpen ? isoSpaceKey : '全屋') + '-' + new Date().toISOString().slice(0, 10) + '.png';
                a.href = c2.toDataURL('image/png');
                a.click();
                showToast('🖼️ 高清快照已导出');
            } catch (e) { showToast('导出失败：' + e.message); }
        });
    }
    function openIsoAlbum() {
        let mask = document.getElementById('isoAlbumMask'); if (mask) mask.remove();
        mask = document.createElement('div');
        mask.className = 'iso-sheet-mask'; mask.id = 'isoAlbumMask';
        mask.innerHTML = '<div class="iso-sheet">' +
            '<div class="iso-sheet-grab"></div>' +
            '<div class="flex items-center justify-between mb-1"><span class="font-bold text-[#5E3A20]">🗂️ 小屋相册（仅本机）</span>' +
            '<button onclick="closeIsoAlbum()" class="iso-chip-btn">关闭</button></div>' +
            '<div id="isoAlbumBody" class="mt-2"></div>' +
            '<p class="text-[10px] text-[#B08968] mt-3 text-center">清理浏览器缓存会丢失，重要的快照请「⬇ 下载」保存</p></div>';
        mask.addEventListener('click', function (e) { if (e.target === mask) closeIsoAlbum(); });
        document.body.appendChild(mask);
        _renderIsoAlbum();
    }
    function closeIsoAlbum() { const m = document.getElementById('isoAlbumMask'); if (m) m.remove(); }
    function _renderIsoAlbum() {
        const el = document.getElementById('isoAlbumBody');
        if (!el) return;
        const arr = _isoAlbum();
        el.innerHTML = arr.length ?
            '<div class="iso-album-grid">' + arr.map(function (a) {
                return '<div><img src="' + a.src + '" onclick="isoAlbumView(\\'' + a.id + '\\')" alt="快照">' +
                    '<div class="flex justify-between items-center mt-1">' +
                    '<span class="text-[9px] text-[#B08968] truncate flex-1">' + _isoEsc(a.name) + '</span>' +
                    '<button class="text-[11px] px-1" onclick="isoAlbumDownload(\\'' + a.id + '\\')">⬇</button>' +
                    '<button class="text-[11px] px-1" onclick="isoAlbumDelete(\\'' + a.id + '\\')">🗑</button>' +
                    '</div></div>';
            }).join('') + '</div>'
            : '<p class="text-xs text-[#B08968] text-center py-6">相册还是空的，先「📸 存入小屋相册」吧 🌸</p>';
    }
    function isoAlbumView(id) {
        const a = _isoAlbum().find(x => x.id === id);
        if (!a) return;
        const mask = document.createElement('div');
        mask.className = 'iso-sheet-mask';
        mask.style.alignItems = 'center';
        mask.innerHTML = '<div class="text-center" onclick="event.stopPropagation()">' +
            '<img src="' + a.src + '" style="max-width:92vw;max-height:70vh;border-radius:18px;border:3px solid #FFFDF8;box-shadow:0 18px 50px rgba(0,0,0,0.4)">' +
            '<p class="text-xs text-white mt-2 font-semibold">' + _isoEsc(a.name) + ' · 点击空白处关闭</p></div>';
        mask.addEventListener('click', function () { mask.remove(); });
        document.body.appendChild(mask);
    }
    function isoAlbumDownload(id) {
        const a = _isoAlbum().find(x => x.id === id);
        if (!a) return;
        const el = document.createElement('a');
        el.href = a.src;
        el.download = '栗子小屋-' + a.name + '.jpg';
        el.click();
    }
    function isoAlbumDelete(id) {
        _isoAlbumSave(_isoAlbum().filter(x => x.id !== id));
        _renderIsoAlbum();
        showToast('🗑 快照已删除');
    }

    // —— 首页小屋卡片（设为主界面 / 点击直达） ——
    function _renderHomeCabinCard() {
        const el = document.getElementById('homeCabinCard');
        if (!el) return;
        try {
            if (!isoState) _loadIsoState();
            const plan = isoState.homePlanId ? _isoPlans().find(p => p.id === isoState.homePlanId) : null;
            if (plan) {
                const r = _buildOverviewSvg({ spaces: plan.spaces, theme: plan.theme, houseKey: plan.houseKey, hidden: {}, night: plan.night, light: plan.light });
                el.classList.remove('hidden');
                el.innerHTML = r.svg +
                    '<div class="hcc-label"><span>🏡</span><span>我的小屋 · ' + _isoEsc(plan.name || '未命名') + '</span><span class="text-[#D9A56E]">›</span></div>';
                el.onclick = function () { openGameRoom(); };
            } else {
                el.classList.add('hidden');
            }
        } catch (e) { el.classList.add('hidden'); }
    }

    // —— 启动直达小屋（设置页开关 + 纯本地偏好） ——
    function toggleIsoStartup(on) {
        localStorage.setItem('lizi_cabin_startup', on ? '1' : '0');
        showToast(on ? '🌸 已开启：下次打开直接进小屋' : '已关闭启动直达');
    }
    function isoStartupOn() { try { return localStorage.getItem('lizi_cabin_startup') === '1'; } catch (e) { return false; } }

    // —— PWA 离线：注册 Service Worker（https / localhost 下生效） ——
    (function () {
        try {
            if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
                window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('[PWA] 注册失败', e); }); });
            }
        } catch (e) {}
    })();

    // —— Q版小人：在编辑器房间里溜达，会坐沙发/椅子，夜晚回床上睡觉（💤） ——`,
'小屋 3.0 新功能模块');

// ============ 2. renderHomePage 联动：首页卡片渲染 ============
rep(
`            if (tab === 'home') { renderHomePage(); try { truthUpdateBadge(); } catch (e) {} }`,
`            if (tab === 'home') { renderHomePage(); try { _renderHomeCabinCard(); } catch (e) {} try { truthUpdateBadge(); } catch (e) {} }`,
'switchTab home 渲染卡片');

// ============ 3. 启动直达：revealBoot 分支 ============
rep(
`            if (appData.spaceId && appData.currentUserId) {
                document.getElementById('bottomNavBar').classList.remove('hidden');
                switchTab('home');
                fitChatInputBar();`,
`            if (appData.spaceId && appData.currentUserId) {
                document.getElementById('bottomNavBar').classList.remove('hidden');
                switchTab('home');
                fitChatInputBar();
                // 🌸 启动直达小屋（纯本地偏好）
                try { if (isoStartupOn()) setTimeout(function () { openGameRoom(); }, 120); } catch (e) {}`,
'启动直达小屋');

// ============ 4. renderSettingsPage：初始化开关状态 ============
rep(
`    function renderSettingsPage() {
        document.getElementById('settingSpaceNameInput').value = appData.spaceName || '';
        document.getElementById('settingMyNameInput').value = getCurrentUser()?.nickname || '';
        document.getElementById('settingTogetherDateInput').value = appData.togetherDate || '';
        document.getElementById('settingDNDCheck').checked = appData.settings.dnd || false;`,
`    function renderSettingsPage() {
        document.getElementById('settingSpaceNameInput').value = appData.spaceName || '';
        document.getElementById('settingMyNameInput').value = getCurrentUser()?.nickname || '';
        document.getElementById('settingTogetherDateInput').value = appData.togetherDate || '';
        document.getElementById('settingDNDCheck').checked = appData.settings.dnd || false;
        const cabinStartupEl = document.getElementById('settingCabinStartupCheck');
        if (cabinStartupEl) cabinStartupEl.checked = isoStartupOn();`,
'renderSettingsPage 开关初始化');

fs.writeFileSync(file, html, 'utf8');
console.log('JS 补丁 C 完成，共 ' + n + ' 处 ✓');
