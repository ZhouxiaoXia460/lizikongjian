// 小屋 3.0 运行时冒烟测试：stub DOM + localStorage，执行主脚本块，跑小屋关键路径
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');

// 提取第 5 个（主）script 块
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while ((m = re.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    if (m[2].trim() === '') continue;
    blocks.push({ attrs: m[1], code: m[2] });
}
const main = blocks.find(b => b.code.includes('ISO_GRID'));
if (!main) { console.error('未找到小屋脚本块'); process.exit(1); }

// —— DOM stub ——
function makeEl(id) {
    const el = {
        id: id || '', style: new Proxy({}, { get: () => '', set: () => true }),
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        dataset: {}, children: [], innerHTML: '', textContent: '', value: '',
        clientWidth: 400, clientHeight: 500,
        appendChild(c) { this.children.push(c); return c; },
        removeChild() {}, remove() {}, querySelectorAll() { return []; },
        querySelector() { return null; }, addEventListener() {}, removeEventListener() {},
        getBoundingClientRect() { return { left: 0, top: 0, right: 400, bottom: 500, width: 400, height: 500 }; },
        setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {},
        parentNode: null, setPointerCapture() {},
        firstChild: null, contains() { return false; }, offsetWidth: 100, offsetHeight: 50,
    };
    return el;
}
const els = {};
const documentStub = {
    getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
    createElement(tag) { const e = makeEl(''); e.tagName = tag; return e; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {}, removeEventListener() {},
    body: makeEl('body'), documentElement: makeEl('html'), head: makeEl('head'),
    fonts: { ready: Promise.resolve() },
    visibilityState: 'visible', hidden: false,
};
const storage = {};
const localStorageStub = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; },
};
const sandbox = {
    window: {}, document: documentStub, localStorage: localStorageStub,
    navigator: { userAgent: 'test', clipboard: undefined },
    location: { protocol: 'http:', hostname: 'localhost', href: 'http://localhost:8000/index.html', origin: 'http://localhost:8000' },
    console, setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame: fn => setTimeout(fn, 16), cancelAnimationFrame: id => clearTimeout(id),
    Image: class { set src(v) { if (this.onload) setTimeout(this.onload, 0); } },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    Blob: class {}, FileReader: class { readAsText() { if (this.onload) setTimeout(this.onload, 0); } },
    prompt: () => '测试名', confirm: () => true, alert: () => {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
    fetch: () => Promise.reject(new Error('offline-test')),
    history: {}, screen: { width: 400, height: 800 }, devicePixelRatio: 2,
    performance: { now: () => Date.now() },
    CustomEvent: class {}, Event: class {}, TouchEvent: class {},
    crypto: require('crypto'),
    JSON, Math, Date, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
    Object, Array, String, Number, Boolean, RegExp, Error, Promise, Set, Map, Proxy, Reflect,
    Symbol, Function, eval, Uint8Array, ArrayBuffer, TextEncoder: require('util').TextEncoder,
};
sandbox.window = sandbox; // window 指向沙箱自身（函数声明挂全局）
sandbox.addEventListener = function () {};
sandbox.removeEventListener = function () {};
sandbox.dispatchEvent = function () { return true; };
sandbox.innerWidth = 400; sandbox.innerHeight = 800; sandbox.outerWidth = 400; sandbox.outerHeight = 800;
sandbox.scroll = function () {}; sandbox.scrollTo = function () {}; sandbox.scrollBy = function () {};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

let failed = 0;
const t = (name, fn) => {
    try { fn(); console.log('✓ ' + name); }
    catch (e) { failed++; console.log('✗ ' + name + ' :: ' + e.message); }
};

try { vm.runInContext(main.code, sandbox, { filename: 'main.js' }); console.log('✓ 主脚本块执行无异常'); }
catch (e) { console.error('✗ 主脚本块执行异常: ' + e.stack.split('\n').slice(0, 5).join('\n')); process.exit(1); }

// 顶层 let 变量在脚本作用域内，通过 eval 桥接访问
function G(expr) { return vm.runInContext('(' + expr + ')', sandbox, { filename: 'bridge.js' }); }
function S(expr) { vm.runInContext(expr, sandbox, { filename: 'bridge.js' }); }
const isoStateOf = () => G('typeof isoState !== "undefined" ? isoState : undefined');

t('openGameRoom（进入小屋总览）', () => sandbox.openGameRoom());
t('_loadIsoState 初始化（含 3.0 字段）', () => {
    sandbox._loadIsoState();
    const st = (isoStateOf() || {});
    if (!st.houseKey) throw new Error('houseKey 缺失');
    if (!st.light) throw new Error('light 缺失');
    if (!Array.isArray(st.plans) || !st.plans.length) throw new Error('plans 缺失');
});
t('总览渲染 _renderIsoHouse', () => sandbox._renderIsoHouse());
t('LOFT 总览含 4 热点（1F/2F/副楼/花园）', () => {
    const r = G('_buildOverviewSvg')({ spaces: (isoStateOf() || {}).spaces, theme: 'cozy', houseKey: 'loft', hidden: {}, night: false });
    if (r.spots.length !== 4) throw new Error('热点数=' + r.spots.length);
});
t('小平层总览渲染', () => G('_buildOverviewSvg')({ spaces: (isoStateOf() || {}).spaces, theme: 'cozy', houseKey: 'flat', hidden: {}, night: false }));
t('带院小屋总览渲染', () => G('_buildOverviewSvg')({ spaces: (isoStateOf() || {}).spaces, theme: 'cozy', houseKey: 'cottage', hidden: {}, night: false }));
t('开间公寓总览渲染', () => G('_buildOverviewSvg')({ spaces: (isoStateOf() || {}).spaces, theme: 'cozy', houseKey: 'studio', hidden: {}, night: false }));
t('夜晚+暖光总览渲染', () => G('_buildOverviewSvg')({ spaces: (isoStateOf() || {}).spaces, theme: 'cozy', houseKey: 'loft', hidden: {}, night: true, light: { bright: 0.3, warm: 0.85 } }));
t('搬家 setIsoHouse(cottage)', () => sandbox.isoMoveHouse('cottage'));
t('搬家后当前户型空间切换', () => { if (sandbox._isoHouseSpaces().indexOf('cot') < 0) throw new Error('cot 不在户型内'); });
t('搬回 loft 家具保留', () => { sandbox.isoMoveHouse('loft'); if (!(isoStateOf() || {}).spaces) throw new Error('spaces 丢失'); });
t('进入房间编辑 selectIsoSpace(f1)', () => sandbox.selectIsoSpace('f1'));
t('进入花园 selectIsoSpace(garden)', () => sandbox.selectIsoSpace('garden'));
t('建世界 _buildIsoWorld（花园户外模式）', () => sandbox._buildIsoWorld());
t('渲染家具 _renderIsoItems', () => sandbox._renderIsoItems());
t('样板间 applyIsoSample（花园）', () => sandbox.applyIsoSample());
t('组合 applyIsoCombo(gardenTea)', () => sandbox.applyIsoCombo('gardenTea'));
t('家具总数 111 件定义', () => { const c = Object.keys(G('FURN_DEF')).length; if (c < 110) throw new Error('FURN_DEF=' + c); });
t('家具分类 11 类全有货', () => {
    G('FURN_LIB').forEach(c => { if (!c.keys.length) throw new Error(c.cat + ' 空'); c.keys.forEach(k => { if (!G('FURN_DEF')[k]) throw new Error(c.cat + ' 引用不存在: ' + k); }); });
});
t('缩放滑杆 isoZoomSlider(1.5)', () => sandbox.isoZoomSlider('1.5'));
t('昼夜 toggleIsoNight', () => sandbox.toggleIsoNight());
t('光影预设 isoLightPreset(dusk)', () => sandbox.isoLightPreset('dusk'));
t('光影微调 isoSetLight(bright, 20)', () => sandbox.isoSetLight('bright', '20'));
t('恢复默认 isoResetLight', () => sandbox.isoResetLight());
t('吸附开关 isoToggleSnap（自由摆放）', () => sandbox.isoToggleSnap());
t('自由摆放 _snapDrop 不吸附', () => {
    const r = G('_snapDrop')({ gx: 3.37, gy: 2.61 }, 'tea', 0);
    if (r.gx !== Math.round((3.37 + 0.5) * 100) / 100 - 0.5) throw new Error('自由模式仍被吸附: ' + JSON.stringify(r));
});
t('吸附开关还原', () => sandbox.isoToggleSnap());
t('回收模式 toggle', () => sandbox.isoRecycleToggle());
t('回收模式关闭', () => sandbox.isoRecycleToggle());
t('单品缩放选中件 +', () => {
    S('(function(){ const sp = isoState.spaces[isoSpaceKey]; if (!sp.items.length) { sp.items.push({ id: "t1", k: "tea", gx: 2, gy: 2 }); } isoSelId = sp.items[0].id; })()');
    const s0 = G('(function(){ const it = isoState.spaces[isoSpaceKey].items.find(i=>i.id===isoSelId); return it ? (it.s||1) : -1; })()');
    if (s0 < 0) throw new Error('没有选中件');
    sandbox.isoScaleSelected(1);
    const s1 = G('(function(){ const it = isoState.spaces[isoSpaceKey].items.find(i=>i.id===isoSelId); return it ? (it.s||1) : -1; })()');
    if (s1 !== Math.round(Math.min(1.7, s0 + 0.15) * 100) / 100) throw new Error('scale 错误: ' + s0 + '→' + s1);
});
t('渲染 _renderIsoItems（含缩放件）', () => sandbox._renderIsoItems());
t('旋转 isoRotateSelected', () => sandbox.isoRotateSelected());
t('复制 isoCopySelected', () => sandbox.isoCopySelected());
t('撤销 isoUndo', () => sandbox.isoUndo());
t('重做 isoRedo', () => sandbox.isoRedo());
t('方案保存 isoPlanSaveNew', () => {
    els['isoPlanName'] = makeEl('isoPlanName'); els['isoPlanName'].value = '测试方案A';
    els['isoPlanNote'] = makeEl('isoPlanNote'); els['isoPlanNote'].value = '冒烟测试';
    const before = (isoStateOf() || {}).plans.length;
    sandbox.isoPlanSaveNew();
    if ((isoStateOf() || {}).plans.length !== before + 1) throw new Error('方案数未增加');
});
t('方案面板 openIsoPlans', () => sandbox.openIsoPlans());
t('设为主界面 isoPlanSetHome', () => {
    const p = (isoStateOf() || {}).plans[(isoStateOf() || {}).plans.length - 1];
    sandbox.isoPlanSetHome(p.id);
    if ((isoStateOf() || {}).homePlanId !== p.id) throw new Error('homePlanId 未设置');
});
t('方案导出 isoPlanExport', () => sandbox.isoPlanExport((isoStateOf() || {}).plans[0].id));
t('方案删除 isoPlanDelete', () => {
    const p = (isoStateOf() || {}).plans[(isoStateOf() || {}).plans.length - 1];
    sandbox.isoPlanDelete(p.id);
    if ((isoStateOf() || {}).plans.find(x => x.id === p.id)) throw new Error('未删除');
});
t('首页卡片 _renderHomeCabinCard（含 SVG）', () => {
    sandbox._renderHomeCabinCard();
    const el = els['homeCabinCard'];
    if (el.innerHTML.indexOf('<svg') < 0) throw new Error('卡片无 SVG');
});
t('搬家面板 openIsoHouses', () => sandbox.openIsoHouses());
t('光影面板 openIsoLight', () => sandbox.openIsoLight());
t('快照菜单 openIsoShotMenu', () => sandbox.openIsoShotMenu());
t('相册面板 openIsoAlbum', () => sandbox.openIsoAlbum());
t('导出 SVG _editorRoomSvg', () => { const s = sandbox._editorRoomSvg(); if (!s.startsWith('<svg')) throw new Error('SVG 异常'); });
t('回总览 _showIsoHouse', () => sandbox._showIsoHouse());
t('主界面方案 → 首页卡片', () => {
    const p = (isoStateOf() || {}).plans[0];
    sandbox.isoPlanSetHome(p.id);
    sandbox._renderHomeCabinCard();
});
t('旧槽位迁移模拟', () => {
    S('isoState = null');
    storage['lizi_iso_v2'] = JSON.stringify({
        theme: 'cozy', spaces: { f1: { items: [{ id: 'a', k: 'sofa2', gx: 2, gy: 3 }] } },
        slots: [null, { f1: { items: [{ id: 'b', k: 'bed2', gx: 3, gy: 3 }] } }, null], slot: 1
    });
    sandbox._loadIsoState();
    const st = isoStateOf() || {};
    if ((st.plans || []).length !== 1) throw new Error('迁移方案数=' + (st.plans || []).length);
    if (st.plans[0].name !== '方案二') throw new Error('迁移命名错误: ' + st.plans[0].name);
    // 清理测试数据，还原正常状态
    S('isoState = null');
    delete storage['lizi_iso_v2'];
});
t('数据持久化 _isoSave 后可读回', () => {
    sandbox.openGameRoom();
    sandbox._isoSave();
    const raw = JSON.parse(storage['lizi_iso_v2']);
    if (!raw.houseKey || !raw.light || !raw.plans) throw new Error('保存字段缺失');
});

console.log(failed ? ('\n✗ ' + failed + ' 项失败') : '\n全部冒烟测试通过 ✓');
process.exit(failed ? 1 : 0);
