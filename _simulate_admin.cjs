// 模拟浏览器执行 admin.html 内嵌脚本，验证口令逻辑（scratch）
const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// ---- 最小 DOM 桩 ----
const elems = {};
function makeEl(id) {
    return {
        id, value: '', textContent: '', hidden: true, disabled: false,
        listeners: {},
        addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
        dispatch(ev, extra) { (this.listeners[ev] || []).forEach(fn => fn(Object.assign({ preventDefault() {} }, extra))); },
    };
}
['pinView', 'pin', 'pinBtn', 'pinMsg', 'panel', 'cur', 'title', 'content', 'pubBtn', 'offBtn', 'reBtn', 'msg'].forEach(id => { elems[id] = makeEl(id); });
global.document = { getElementById: id => elems[id] || null, title: '栗子公告设置' };
const store = {};
global.sessionStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
global.window = global; // 让 window.__liziUnlock / window.AdminGW 生效（AdminGW 不定义 = 网关模块缺失场景）

// 页面初始：pinView hidden=true（HTML 属性），脚本会解锁显示
elems.pinView.hidden = true;

eval(inline); // 执行页面脚本（绑定事件 + 初始化）

console.log('[0] 脚本执行后 pinView.hidden =', elems.pinView.hidden, '（期望 false，口令门显示）');

// 场景A：错误口令
elems.pin.value = 'lizi123';
elems.pinBtn.dispatch('click');
console.log('[A] 错误口令 → 提示:', JSON.stringify(elems.pinMsg.textContent), '| pinView.hidden =', elems.pinView.hidden);

// 场景B：大写+空格（用户最可能的翻车输入）
elems.pin.value = 'Lizi 666';
elems.pinBtn.dispatch('click');
console.log('[B] "Lizi 666" → panel.hidden =', elems.panel.hidden, '（期望 true=已解锁）', '| sessionStorage =', store['lizi_admin_ok'], '| 提示:', JSON.stringify(elems.msg.textContent));

// 场景C：全角字符
elems.panel.hidden = true; elems.pinView.hidden = false; // 重置
delete store['lizi_admin_ok'];
elems.pin.value = 'ｌｉｚｉ６６６';
elems.pinBtn.dispatch('click');
console.log('[C] 全角ｌｉｚｉ６６６ → panel.hidden =', elems.panel.hidden, '（期望 true=已解锁）');

// 场景D：onclick 内联通道
elems.panel.hidden = true; elems.pinView.hidden = false;
delete store['lizi_admin_ok'];
elems.pin.value = 'LIZI666';
if (typeof window.__liziUnlock === 'function') { window.__liziUnlock(); }
console.log('[D] "LIZI666" 经内联 onclick → panel.hidden =', elems.panel.hidden, '（期望 true=已解锁）');

const pass = elems.pinView.hidden === false && elems.pinMsg.textContent.indexOf('口令不对') >= 0 && store['lizi_admin_ok'] === '1';
console.log(pass ? 'SIMULATION PASS' : 'SIMULATION CHECK RESULTS ABOVE');
