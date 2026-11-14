// 视觉检查：把总览与编辑器 SVG 渲染成 PNG 供人工核查
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while ((m = re.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    if (m[2].trim() === '') continue;
    blocks.push(m[2]);
}
const main = blocks.find(b => b.includes('ISO_GRID'));

function makeEl(id) {
    const store = {};
    return {
        id: id || '', style: new Proxy(store, { get: (t, k) => (typeof k === 'string' ? (t[k] === undefined ? '' : t[k]) : ''), set: (t, k, v) => { t[k] = v; return true; } }),
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        dataset: {}, innerHTML: '', textContent: '', value: '', clientWidth: 720, clientHeight: 500,
        appendChild(c) { return c; }, removeChild() {}, remove() {}, querySelectorAll() { return []; },
        querySelector() { return null; }, addEventListener() {}, removeEventListener() {},
        getBoundingClientRect() { return { left: 0, top: 0, right: 720, bottom: 500, width: 720, height: 500 }; },
        setAttribute() {}, getAttribute() { return null; }, parentNode: null, setPointerCapture() {},
        contains() { return false; }, offsetWidth: 100, offsetHeight: 50,
    };
}
const els = {};
const documentStub = {
    getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
    createElement(tag) { const e = makeEl(''); e.tagName = tag; return e; },
    querySelectorAll() { return []; }, querySelector() { return null; },
    addEventListener() {}, removeEventListener() {},
    body: makeEl('body'), documentElement: makeEl('html'), head: makeEl('head'),
    fonts: { ready: Promise.resolve() }, visibilityState: 'visible', hidden: false,
};
const storage = {};
const sandbox = {
    document: documentStub,
    localStorage: { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } },
    navigator: { userAgent: 'test' },
    location: { protocol: 'http:', hostname: 'localhost', href: 'http://localhost:8000/index.html', origin: 'http://localhost:8000' },
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: fn => setTimeout(fn, 16), cancelAnimationFrame: id => clearTimeout(id),
    Image: class { set src(v) { if (this.onload) setTimeout(this.onload, 0); } },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    Blob: class {}, FileReader: class { readAsText() {} },
    prompt: () => '名', confirm: () => true, alert: () => {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
    fetch: () => Promise.reject(new Error('offline')),
    performance: { now: () => Date.now() }, devicePixelRatio: 2,
    CustomEvent: class {}, Event: class {}, crypto: require('crypto'),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    innerWidth: 800, innerHeight: 900, scroll() {}, scrollTo() {},
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(main, sandbox, { filename: 'main.js' });

// 布置一套样板间到每个户型并存 SVG
const houses = ['loft', 'flat', 'cottage', 'studio'];
fs.mkdirSync('preview', { recursive: true });
for (const hk of houses) {
    vm.runInContext(`(function(){
        _loadIsoState();
        isoState.houseKey = '${hk}';
        isoSpaceKey = _isoHouseSpaces()[0];
        _renderIsoHouse();
    })()`, sandbox);
    const r = vm.runInContext(`_buildOverviewSvg({ spaces: isoState.spaces, theme: isoState.theme, houseKey: isoState.houseKey, hidden: {}, night: false })`, sandbox);
    // 包一层带奶油底色的 HTML 方便浏览器打开
    const page = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="background:#FDF6EC;margin:0;padding:20px">' +
        '<h3>' + hk + '</h3>' + r.svg + '</body></html>';
    fs.writeFileSync('preview/overview-' + hk + '.html', page, 'utf8');
    console.log('preview/overview-' + hk + '.html  (' + r.w + 'x' + r.h + ', ' + r.spots.length + ' 热点)');
}
// 花园编辑器视图
vm.runInContext(`(function(){
    _loadIsoState();
    isoState.houseKey = 'loft';
    selectIsoSpace('garden');
    applyIsoSample();
})()`, sandbox);
const worldSvg = els['isoWorld'] ? String(els['isoWorld'].innerHTML || '') : '';
if (worldSvg.includes('<svg')) {
    fs.writeFileSync('preview/editor-garden.html', '<!DOCTYPE html><html><body style="background:#FDF6EC;margin:0;padding:20px">' + worldSvg + '</body></html>', 'utf8');
    console.log('preview/editor-garden.html');
} else console.log('world svg 缺失');
// 1F 编辑器视图（带阳台）
vm.runInContext(`(function(){ selectIsoSpace('f1'); applyIsoSample(); })()`, sandbox);
const world2 = els['isoWorld'] ? String(els['isoWorld'].innerHTML || '') : '';
if (world2.includes('<svg')) {
    fs.writeFileSync('preview/editor-f1.html', '<!DOCTYPE html><html><body style="background:#FDF6EC;margin:0;padding:20px">' + world2 + '</body></html>', 'utf8');
    console.log('preview/editor-f1.html');
}
console.log('视觉预览已生成 ✓');
process.exit(0);
