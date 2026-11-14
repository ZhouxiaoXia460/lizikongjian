// mergeCloudSnapshot 中 memoBook 合并规则的专项验证（提取函数源码在沙盒中执行）
const fs = require('fs');
const vm = require('vm');
const s = fs.readFileSync('index.html', 'utf8');
const start = s.indexOf('function mergeCloudSnapshot');
if (start < 0) { console.error('未找到 mergeCloudSnapshot'); process.exit(1); }
// 花括号配对提取整个函数
let depth = 0, end = -1;
for (let i = s.indexOf('{', start); i < s.length; i++) {
  if (s[i] === '{') depth++;
  else if (s[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const fnSrc = s.slice(start, end);
const sandbox = {
  console,
  appData: null,
  addActivity: () => {},
  escapeHtml: (x) => String(x),
};
vm.createContext(sandbox);
vm.runInContext(fnSrc, sandbox);
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const clone = (x) => JSON.parse(JSON.stringify(x));

// 场景1：云端柿子的备忘册更新（updatedAt 更大）→ 应采纳
sandbox.appData = {
  currentUserId: 'u1',
  users: { u1: { id: 'u1', joined: true }, u2: { id: 'u2', joined: true } },
  memoBook: { lizi: { cats: [{ id: 'c1', fields: [] }], updatedAt: 100 },
              shizi: { cats: [{ id: 'cOld', fields: [] }], updatedAt: 100 } },
  tombstones: {},
};
const remote1 = { memoBook: { lizi: { cats: [{ id: 'c1', fields: [] }], updatedAt: 100 },
                              shizi: { cats: [{ id: 'cNew', fields: [{ id: 'f1', label: '手机号', value: '138' }] }], updatedAt: 900 } } };
const changed1 = vm.runInContext('mergeCloudSnapshot(' + JSON.stringify(remote1) + ')', sandbox);
ok(changed1 === true, '云端更新时返回有变化');
ok(sandbox.appData.memoBook.shizi.cats[0].id === 'cNew', '柿子的备忘册被云端新版覆盖（新者胜）');
ok(sandbox.appData.memoBook.lizi.updatedAt === 100 && sandbox.appData.memoBook.lizi.cats[0].id === 'c1', '栗子的备忘册未受影响');

// 场景2：本地更新（updatedAt 更大）→ 保持本地
const remote2 = { memoBook: { shizi: { cats: [{ id: 'cStale', fields: [] }], updatedAt: 50 } } };
const changed2 = vm.runInContext('mergeCloudSnapshot(' + JSON.stringify(remote2) + ')', sandbox);
ok(changed2 === false, '云端更旧时无变化');
ok(sandbox.appData.memoBook.shizi.cats[0].id === 'cNew', '本地新版保持不变');

// 场景3：本地缺某个人的备忘册 → 采纳云端
sandbox.appData.memoBook = { lizi: { cats: [], updatedAt: 100 } };
const remote3 = { memoBook: { shizi: { cats: [{ id: 'cR', fields: [] }], updatedAt: 500 } } };
vm.runInContext('mergeCloudSnapshot(' + JSON.stringify(remote3) + ')', sandbox);
ok(sandbox.appData.memoBook.shizi && sandbox.appData.memoBook.shizi.cats[0].id === 'cR', '本地缺失时采纳云端');

// 场景4：云端没有 memoBook（老版本快照）→ 不动本地
sandbox.appData.memoBook = { lizi: { cats: [{ id: 'keep', fields: [] }], updatedAt: 100 } };
const changed4 = vm.runInContext('mergeCloudSnapshot({ users: {} })', sandbox);
ok(sandbox.appData.memoBook.lizi.cats[0].id === 'keep', '老版本快照不影响本地备忘册');

console.log('==== memoBook 合并: ' + pass + ' 通过, ' + fail + ' 失败 ====');
process.exit(fail ? 1 : 0);
