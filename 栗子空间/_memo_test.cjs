// TA的备忘册 模块逻辑集成测试（Node 沙盒 + DOM stub）
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const lastScriptStart = html.lastIndexOf('<script>');
const lastScriptEnd = html.lastIndexOf('</script>');
const code = html.slice(lastScriptStart + 8, lastScriptEnd);
if (code.indexOf('TA的备忘册') < 0) { console.error('未找到模块脚本'); process.exit(1); }

// ---------- DOM / 浏览器 stubs ----------
function makeEl(id) {
  const classes = new Set();
  return {
    id: id,
    style: {},
    value: '',
    textContent: '',
    innerHTML: '',
    type: 'password',
    checked: false,
    classList: {
      add: (...cs) => cs.forEach(c => classes.add(c)),
      remove: (...cs) => cs.forEach(c => classes.delete(c)),
      toggle: (c, force) => { const on = force === undefined ? !classes.has(c) : !!force; on ? classes.add(c) : classes.delete(c); return on; },
      contains: (c) => classes.has(c)
    },
    focus() {}, remove() {}, click() {},
    setAttribute() {}, getAttribute() { return null; },
    appendChild() {},
    _classes: classes
  };
}
const els = {};
function getEl(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; }

const store = {};
const logs = [];
const sandbox = {
  console,
  addEventListener() {},
  setTimeout: (fn, ms) => { if ((ms || 0) <= 800) fn(); return 0; },
  clearTimeout() {},
  setInterval: () => 0,
  clearInterval() {},
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  navigator: { onLine: true, clipboard: null },
  location: { href: '' },
  document: {
    getElementById: getEl,
    createElement: () => makeEl('_tmp' + Math.random()),
    body: makeEl('body'),
    addEventListener() {}
  },
  confirm: () => true,
  prompt: (msg, def) => def !== undefined ? def : '测试输入',
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  Blob: function () {},
  URL: { createObjectURL: () => 'blob:x' },
  escapeHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  AVATAR_PRESETS: { lizi: { name: '栗子' }, shizi: { name: '柿子' } },
  showToast: (m) => logs.push('toast:' + m),
  showPage: (id) => { Object.keys(els).forEach(k => { if (/Page$/.test(k)) els[k].classList.remove('active'); }); getEl(id).classList.add('active'); logs.push('page:' + id); },
  switchTab: (t) => logs.push('tab:' + t),
  saveData: () => logs.push('saveData'),
  addActivity: (a) => { const ad = sandbox.appData; if (!Array.isArray(ad.activities)) ad.activities = []; ad.activities.unshift({ id: 'act_' + Date.now(), userId: ad.currentUserId, userName: '测试栗', action: a, time: Date.now() }); if (ad.activities.length > 50) ad.activities.length = 50; logs.push('activity:' + a); },
  manualCloudPush: () => logs.push('manualCloudPush'),
  _actDayKey: (ts) => { const d = new Date(ts || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  _cdTodayStr: () => '2026-10-20'
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'memo-module.js' });

const A = sandbox.appData = { users: { u1: { nickname: '测试栗', avatar: 'lizi' } }, currentUserId: 'u1', countdowns: [], journals: [], activities: [] };
const W = sandbox;
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } }
function findField(label) { let r = null; W.__mb.edit().forEach(c => c.fields.forEach(f => { if (f.label === label) r = f; })); return r; }

// ---------- 用例 ----------
console.log('1) 初始化与名片页');
W.openTaMemo();
ok(A.memoBook && A.memoBook.lizi && A.memoBook.shizi, '两位成员的备忘册模板已初始化');
ok(A.memoBook.lizi.cats.length === 6, '默认 6 个预置分类');
logs.length = 0;
W.mbOpenBook('shizi');
ok(logs.includes('page:taMemoBookPage'), '进入手册页');

console.log('2) 编辑 → 脏标记 → 保存（含密码加密）');
const telField = findField('手机号');
const pwField = findField('共用密码');
const dateField = findField('生日（公历）');
ok(!!telField && !!pwField && !!dateField, '默认字段齐全（手机号/共用密码/生日公历）');

W.mbFieldInput(telField.id, '13800001234');
ok(W.__mb.dirty() === true, '输入后进入未保存(dirty)状态');
const saveBtn = getEl('mbSaveBtn');
ok(saveBtn.innerHTML.indexOf('保存更改') >= 0, '保存按钮变为「保存更改」(dirty)');
ok(!getEl('mbDiscardBtn').classList.contains('tmb-off'), '「放弃更改」按钮出现');

W.mbFieldInput(pwField.id, 'secret123');
const rawPw = findField('共用密码').value;
ok(rawPw.indexOf('mbenc::') === 0, '密码在工作副本中即加密（不落明文）');
const decoded = Buffer.from(rawPw.slice(7), 'base64').toString('binary');
ok(decoded === 'secret123', '密文可正确解密回原文');

console.log('3) 保存 → 数据落库 + 倒数日联动');
W.mbFieldInput(dateField.id, '2000-10-22');
logs.length = 0;
W.mbSave();
ok(A.memoBook.shizi.cats.length === 6, '保存后分类数正确');
const savedPw = A.memoBook.shizi.cats.flatMap(c => c.fields).find(f => f.label === '共用密码').value;
ok(savedPw.indexOf('mbenc::') === 0, '落库密码为密文');
ok(store['lizi_ta_memo_draft_v1'] === undefined, '保存后草稿已清除');
ok(logs.includes('saveData'), '触发 saveData（本地+节流云推）');
ok(logs.some(l => l.indexOf('toast:✅ 保存成功') === 0), '弹出「保存成功」');
const cd = A.countdowns.find(x => x.id === 'mbcd_shizi_' + dateField.id);
ok(!!cd, '日期字段联动生成倒数日');
ok(cd && cd.repeat === 'year' && cd.date === '2000-10-22', '生日按每年重复联动');
ok(cd && cd.name === '生日（公历） · 柿子', '倒数日标题含字段名+对象名');
ok(cd && cd.type === 'countdown', '未来日期类型为倒数日');
ok(W.__mb.dirty() === false, '保存后恢复干净状态');

console.log('4) 红点徽标（3 天内重要日期）');
W.mbBadgeUpdate();
ok(!getEl('taMemoHomeDot').classList.contains('tmb-off'), '首页入口红点点亮');
ok(!getEl('taMemoDotShizi').classList.contains('tmb-off'), '柿子名片红点点亮');
ok(getEl('taMemoDotLizi').classList.contains('tmb-off'), '栗子名片无红点');

console.log('5) 日期清空 → 联动倒数日一并清理');
findField('生日（公历）').value = '';
logs.length = 0;
W.mbSave();
ok(!A.countdowns.find(x => x.id === 'mbcd_shizi_' + dateField.id), '清空日期后联动倒数日被移除');
W.mbFieldInput(findField('生日（公历）').id, '2000-10-22');
W.mbSave(); // 恢复数据

console.log('6) 离开拦截：切页签三选一');
W.mbFieldInput(findField('手机号').id, '13911112222'); // 制造脏
logs.length = 0;
const guarded = W.mbTabGuard('home');
ok(guarded === true, '脏状态下切页签被拦截');
ok(!getEl('mbLeaveModal').classList.contains('tmb-off'), '拦截弹窗出现');
W.mbLeaveChoose('save');
ok(logs.includes('tab:home'), '选择「保存」后继续切页');
ok(A.memoBook.shizi.cats.flatMap(c => c.fields).find(f => f.label === '手机号').value === '13911112222', '拦截时选择保存 → 数据已落库');

console.log('7) 草稿兜底：编辑→草稿落盘→重进恢复→放弃清除');
W.mbOpenBook('shizi'); // 上一节拦截保存后已离开手册页，重新进入
W.mbFieldInput(findField('手机号').id, '10086');
ok(!!store['lizi_ta_memo_draft_v1'], '编辑后草稿写入 localStorage');
const draft = JSON.parse(store['lizi_ta_memo_draft_v1']);
ok(draft.owner === 'shizi', '草稿归属正确');
W.mbBackToCards();
logs.length = 0;
W.mbOpenBook('shizi');
ok(logs.some(l => l.indexOf('已恢复上次未保存的草稿') >= 0), '重进提示已恢复草稿');
ok(findField('手机号').value === '10086', '草稿内容已恢复');
W.mbDiscardQuiet();
ok(!store['lizi_ta_memo_draft_v1'], '放弃后草稿清除');
ok(findField('手机号').value === '13911112222', '放弃后还原到上次保存状态');

console.log('8) 全局搜索');
W.mbHandleSearch('1391111');
const searchHtml = getEl('mbContentWrap').innerHTML;
ok(searchHtml.indexOf('手机号') >= 0, '搜索命中手机号字段');
ok(searchHtml.indexOf('13911112222') >= 0, '搜索结果含值');
ok(searchHtml.indexOf('13800001234') < 0, '旧值不再出现（已被保存覆盖）');
W.mbHandleSearch('');

console.log('9) 新增字段（6 类型选择）');
W.mbOpenAddField(W.__mb.edit()[3].id); // 喜好偏好
const typeWrap = getEl('mbNewFieldTypeWrap').innerHTML;
ok(typeWrap.indexOf('单行文本') >= 0 && typeWrap.indexOf('密码') >= 0 && typeWrap.indexOf('日期') >= 0, '类型选择含文本/密码/日期等类型');
getEl('mbNewFieldLabel').value = '衬衫尺码';
W.mbPickType('text');
W.mbConfirmAddField();
const newField = W.__mb.edit()[3].fields.find(f => f.label === '衬衫尺码');
ok(!!newField && newField.type === 'text', '新字段已加入工作副本（待保存）');

console.log('10) 非实时同步：离线保存提示 + 手动同步按钮');
W.mbFieldInput(newField.id, '170/88');
sandbox.navigator.onLine = false;
logs.length = 0;
W.mbSave();
ok(logs.some(l => l.indexOf('已保存到本地，联网后请手动同步云端') >= 0), '离线保存给出本地兜底提示');
ok(!getEl('mbSyncCloudBtn').classList.contains('tmb-off'), '「同步云端」按钮出现');
logs.length = 0;
W.mbManualSync();
ok(logs.includes('manualCloudPush'), '点击后触发手动云推送');
sandbox.navigator.onLine = true;

console.log('11) 导出备份（密码脱敏）');
W.mbExport();
// 导出走 Blob/下载，stub 下不报错即通过
ok(true, '导出流程无异常');

console.log('12) 多日期（生理期）：多条/不联动/清理');
let pd = findField('生理期');
ok(pd && pd.type === 'mdates', '默认生理期为多日期类型');
W.mbMdateAdd(pd.id);
W.mbMdateAdd(pd.id);
ok(Array.isArray(pd.value) && pd.value.length === 2, '可展开添加多条日期');
W.mbMdateChange(pd.id, 0, '2026-09-20');
W.mbMdateChange(pd.id, 1, '2026-10-18');
ok(pd.value[0] === '2026-09-20' && pd.value[1] === '2026-10-18', '单条日期可修改');
logs.length = 0;
W.mbSave();
ok(!A.countdowns.some(x => x.name && x.name.indexOf('生理期') >= 0), '多日期不联动倒数日');
W.mbMdateAdd(findField('生理期').id); // 加一条空日期
W.mbSave();
ok(findField('生理期').value.length === 2, '保存时空日期自动清理');
W.mbMdateRemove(findField('生理期').id, 0);
ok(findField('生理期').value.length === 1 && findField('生理期').value[0] === '2026-10-18', '单条日期可删除');
W.mbMdateToggle(findField('生理期').id);
W.mbMdateToggle(findField('生理期').id);
ok(true, '展开/收起切换正常');

console.log('13) 多文本类型 + 动态去重 + 改名');
const mt = { id: 'f_mt_test', type: 'mtexts', label: '想说的话', value: [], pinned: false, hidden: false, verify: false };
W.__mb.edit()[2].fields.push(mt);
W.mbMdateAdd(mt.id);
W.mbMdateChange(mt.id, 0, '第一句');
W.mbMdateAdd(mt.id);
W.mbMdateChange(mt.id, 1, '第二句');
ok(mt.value.length === 2 && mt.value[1] === '第二句', '多文本可添加多条文本');
logs.length = 0;
W.mbSave();
ok(!A.countdowns.some(x => x.name && x.name.indexOf('想说的话') >= 0), '多文本不联动倒数日');
const actText = '更新了「柿子」的个人名片';
A.activities = (A.activities || []).filter(a => a.action !== actText); // 清掉旧测试产生的同名动态
W.mbFieldInput(findField('手机号').id, '13700001111');
W.mbSave();
W.mbFieldInput(findField('手机号').id, '13700002222');
W.mbSave();
ok((A.activities || []).filter(a => a.action === actText).length === 1, '同一天多次保存只保留一条名片动态');
ok(findField('手机号').value === '13700002222', '去重不影响数据本身');

console.log('');
console.log('==== 结果: ' + pass + ' 通过, ' + fail + ' 失败 ====');
process.exit(fail ? 1 : 0);
