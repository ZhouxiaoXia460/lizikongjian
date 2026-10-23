// 未读功能逻辑自测（临时脚本）：从 index.html 抽出核心函数，在 Node 中跑场景断言
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function slice(startMarker, endMarker) {
    const a = html.indexOf(startMarker);
    const b = html.indexOf(endMarker, a + 1);
    if (a < 0) throw new Error('找不到起始标记: ' + startMarker);
    if (b < 0) throw new Error('找不到结束标记: ' + endMarker);
    return html.slice(a, b);
}

// 1) 未读核心块
const core = slice(
    '// ==================== 未读消息（聊天 / 手帐 / 倒数日 / 备忘录） ====================',
    '        // ==================== 工具函数 ===================='
);
// 2) mergeCloudSnapshot（含动态保留期清理 + readMarks 合并）
const merge = slice(
    '// ==================== 动态保留期（省额度） ====================',
    '    // ==================== 后台自动双向同步'
);
// 3) 退出同步
const exitSync = slice(
    '// ==================== 退出时自动同步',
    '    async function manualCloudPull'
);
// 4) 离线工具箱（辈分计算器 / 金额大写等纯函数）
const tools = slice(
    '// ==================== 离线工具箱（🧰 工具库） ====================',
    '// ==================== 离线工具箱结束 ===================='
);

const stubs = `
var window = { __visitTabKey: null, __liziLastSaveAt: 0 };
var document = { getElementById: function(){ return null; }, querySelector: function(){ return null; }, addEventListener: function(){} };
var localStorage = { _s:{}, getItem:function(k){ return this._s[k] || null; }, setItem:function(k,v){ this._s[k]=String(v); }, removeItem:function(k){ delete this._s[k]; } };
var TCB_CONFIG = { enabled: true, publishKey: 'pk-test', cloudMaxMessages: '500' };
var CloudSync = {
    state: { initialized: true, lastSyncAt: 0, diagnostics: {} },
    _userId: 'lizi',
    _snapshotCloudPath: function(sp){ return 'lizi-space/' + sp + '/snapshot.json'; },
    _gatewayObjectUrl: function(p){ return 'https://gateway.example/' + p; },
    _gwAuthHeader: function(){ return 'Bearer pk-test'; }
};
var _netBytesAdd = function(){};
var STORAGE_KEY = 'lizi_space_final';
var relationship = require('./_relationship.min.js'); // 辈分引擎（与页面内联同源）
var saveCalls = 0;
function saveData(){ saveCalls++; window.__liziLastSaveAt = Date.now(); localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }
function showToast(){}
var appData;
`;

const scenarios = `
// ================= 场景断言 =================
var failures = 0;
function ok(cond, msg) { if (cond) { console.log('  ✓ ' + msg); } else { failures++; console.log('  ✗ ' + msg); } }

appData = {
    spaceId: 'sp1', currentUserId: 'lizi', readMarks: {},
    messages: [], journals: [], countdowns: [],
    memoLists: [{ id: 'default', name: '随手记', icon: '📌', date: '', owner: 'both', items: [] }],
    tombstones: { messages: [], journals: [], memoLists: [], memoItems: [] }
};

console.log('[1] 老用户升级迁移：历史内容全部记为已读');
appData.messages.push({ id: 'm1', senderId: 'shizi', time: Date.now() - 100000 });
appData.journals.push({ id: 'j1', authorId: 'shizi', createTime: Date.now() - 100000, comments: [{ id: 'c1', userId: 'shizi', time: Date.now() - 90000 }] });
var info = getUnreadInfo();
ok(info.chat === 0 && info.journal === 0 && info.countdown === 0 && info.memo === 0, '迁移后历史内容全部已读');

console.log('[2] 聊天：对方新消息计未读，打开聊天页清零');
var _t2 = Date.now();
appData.messages.push({ id: 'm2', senderId: 'shizi', time: _t2 + 1000 });
ok(getUnreadInfo().chat === 1, '对方新消息计 1 条聊天未读');
appData.messages.push({ id: 'm3', senderId: 'lizi', time: _t2 + 2000 });
ok(getUnreadInfo().chat === 1, '自己发的消息不增加未读');
markChatRead();
ok(getUnreadInfo().chat === 0, '打开聊天页（markChatRead）后清零');

console.log('[3] 手帐：新手帐/新留言计未读，只看未读筛选正确，看过清零');
appData.journals.push({ id: 'j2', authorId: 'shizi', createTime: Date.now() + 3000, comments: [] });
info = getUnreadInfo();
ok(info.journal === 1, '对方新手帐计 1 条手帐未读');
ok(_journalUnreadIds().has('j2'), '只看未读集合包含新手帐 j2');
ok(!_journalUnreadIds().has('j1'), '旧手帐 j1 不在未读集合');
markJournalRead('j2');
ok(getUnreadInfo().journal === 0, '打开详情（markJournalRead）后清零');
appData.journals[0].comments.push({ id: 'c2', userId: 'shizi', time: Date.now() + 4000 });
info = getUnreadInfo();
ok(info.journal === 1 && info.journalComments === 1, 'TA 在我的手帐里留言 → 该篇变未读，新留言 1 条');
ok(_journalUnreadIds().has('j1'), '留言让 j1 重新进入未读筛选');
markJournalRead('j1');
ok(getUnreadInfo().journal === 0, '看过手帐后留言未读清零');
appData.journals[0].comments.push({ id: 'c3', userId: 'lizi', time: Date.now() + 5000 });
ok(getUnreadInfo().journal === 0, '自己的留言不算未读');

console.log('[4] 倒数日：对方新增计未读，自己新增不算；进页标记已见 + visit 集合');
appData.countdowns.push({ id: 'cd1', name: '旅行', date: '2026-12-01', type: 'countdown', createTime: Date.now() + 6000 });
ok(getUnreadInfo().countdown === 1, 'TA 新加倒数日计 1 条未读');
_markOwnSeenId('cdSeen', 'cd_own');
appData.countdowns.push({ id: 'cd_own', name: '我的', date: '2026-12-02', type: 'countdown', createTime: Date.now() + 7000 });
ok(getUnreadInfo().countdown === 1, '自己加的倒数日不算未读');
var visit = _ensureVisitSet('cd');
var mks = _myReadMarks();
appData.countdowns.forEach(function (c) { if (!mks.cdSeen[c.id]) { mks.cdSeen[c.id] = Date.now(); visit.add(c.id); } });
ok(getUnreadInfo().countdown === 0, '进入倒数日页（renderCountdownList 的标记逻辑）后未读清零');
ok(visit.has('cd1') && !visit.has('cd_own'), 'visit 集合只含对方新加的（NEW 角标/筛选正确）');
window.__visitTabKey = null;
ok(_ensureVisitSet('cd').size === 0, '切走再回来 visit 集合重置');

console.log('[5] 备忘录：TA 新加条目计未读，自己加不算；进页标记已见');
appData.memoLists[0].items.push({ id: 'item_x', content: 'TA的待办', completed: false, createTime: Date.now() + 8000 });
ok(getUnreadInfo().memo === 1, 'TA 在已见清单里加待办计 1 条未读');
_markOwnSeenId('memoSeen', 'item_own');
appData.memoLists[0].items.push({ id: 'item_own', content: '我的待办', completed: false, createTime: Date.now() + 9000 });
ok(getUnreadInfo().memo === 1, '自己加的待办不算未读');
var mvisit = _ensureVisitSet('memo');
var mm = _myReadMarks();
appData.memoLists.forEach(function (l) {
    if (!mm.memoSeen[l.id]) { mm.memoSeen[l.id] = Date.now(); mvisit.add(l.id); }
    (l.items || []).forEach(function (it) { if (it && !mm.memoSeen[it.id]) { mm.memoSeen[it.id] = Date.now(); mvisit.add(it.id); } });
});
ok(getUnreadInfo().memo === 0, '进入备忘录页后未读清零');
ok(mvisit.has('item_x') && !mvisit.has('item_own'), 'memo visit 集合只含 TA 新加的条目');
appData.memoLists.push({ id: 'list_new', name: 'TA的清单', icon: '🧾', date: '', owner: 'shizi', items: [{ id: 'i1', content: 'a', completed: false, createTime: Date.now() + 10000 }] });
ok(getUnreadInfo().memo === 1, 'TA 新建整张清单计 1 条未读（不按条目重复计）');

console.log('[6] 双端合并：readMarks 按用户取 max，互不回滚');
var myBefore = _myReadMarks().chatAt;
mergeCloudSnapshot({ readMarks: { lizi: { chatAt: 5 }, shizi: { chatAt: Date.now() + 7, jRead: { j9: 42 }, cdSeen: { cd9: 42 }, memoSeen: { m9: 42 } } } });
ok(_myReadMarks().chatAt === myBefore, 'TA 推来的我的更小水位线不回滚本地');
ok(appData.readMarks.shizi.jRead.j9 === 42 && appData.readMarks.shizi.cdSeen.cd9 === 42 && appData.readMarks.shizi.memoSeen.m9 === 42, 'TA 自己的标记原样并入（另一台设备的已读状态可达）');
var bigger = _myReadMarks().chatAt + 500;
mergeCloudSnapshot({ readMarks: { lizi: { chatAt: bigger } } });
ok(_myReadMarks().chatAt === bigger, '我的另一台设备的更大水位线被采纳');
mergeCloudSnapshot({ readMarks: { shizi: { jRead: { j9: 7 } } } });
ok(appData.readMarks.shizi.jRead.j9 === 42, '同名标记按 max 合并，旧值不覆盖');

console.log('[7] 标记裁剪：已删内容的标记被清掉');
appData.countdowns = appData.countdowns.filter(function (c) { return c.id !== 'cd1'; });
_pruneReadMarks();
ok(!('cd1' in _myReadMarks().cdSeen), '已删倒数日的已见标记被裁剪');
ok(_myReadMarks().cdSeen.cd_own > 0, '仍存在的标记保留');

console.log('[8] 退出同步：有未同步改动 → 先拉合并再推送；无改动 → 跳过');
var xhrLog = [];
function FakeXHR() { this.headers = {}; }
FakeXHR.prototype.open = function (m, u, a) { this.method = m; this.url = u; };
FakeXHR.prototype.setRequestHeader = function (k, v) { this.headers[k] = v; };
FakeXHR.prototype.send = function (body) {
    xhrLog.push({ method: this.method, body: body });
    if (this.method === 'GET') { this.status = 200; this.responseText = JSON.stringify({ payload: { spaceId: 'sp1', messages: [{ id: 'from_cloud', senderId: 'shizi', time: Date.now() }] } }); }
    else { this.status = 200; this.responseText = ''; }
};
XMLHttpRequest = FakeXHR;
window.__liziLastSaveAt = Date.now() - 1000;
CloudSync.state.lastSyncAt = Date.now() - 5000; // 落后于最后保存 → 有未同步改动
xhrLog = [];
exitSyncFlush();
ok(xhrLog.length === 2 && xhrLog[0].method === 'GET' && xhrLog[1].method === 'POST', '退出同步执行：先 GET 拉云端再 POST 推快照');
var pushed = JSON.parse(xhrLog[1].body);
ok(pushed._type === 'lizi-space-snapshot' && pushed.payload && pushed.payload.spaceId === 'sp1', '推送体是标准快照结构（_type/_updatedAt/payload）');
ok(appData.messages.some(function (m) { return m.id === 'from_cloud'; }), '推送前已把云端新数据合并进本地（防覆盖对方）');
ok(CloudSync.state.lastSyncAt > Date.now() - 60000, '推送成功后更新 lastSyncAt');
xhrLog = [];
exitSyncFlush();
ok(xhrLog.length === 0, '没有未同步改动时退出同步直接跳过（省流量）');

console.log('[9] 动态保留期：只保留近7天，过期自动删除');
appData.activities = [
    { id: 'a_now', userId: 'lizi', action: '今天', time: Date.now() },
    { id: 'a_3d', userId: 'lizi', action: '三天前', time: Date.now() - 3 * 86400000 },
    { id: 'a_8d', userId: 'lizi', action: '八天前', time: Date.now() - 8 * 86400000 }
];
mergeCloudSnapshot({});
ok(appData.activities.length === 2 && !appData.activities.some(a => a.id === 'a_8d'), '8天前的动态被自动删除，7天内的保留');
mergeCloudSnapshot({ activities: [{ id: 'a_old2', userId: 'shizi', action: 'TA的旧动态', time: Date.now() - 9 * 86400000 }, { id: 'a_new2', userId: 'shizi', action: 'TA的新动态', time: Date.now() }] });
ok(!appData.activities.some(a => a.id === 'a_old2'), '云端合并进来的过期动态就地清理（防旧快照反复带回）');
ok(appData.activities.some(a => a.id === 'a_new2'), '云端新动态正常并入');

console.log('[10] 离线工具：辈分计算器（relationship 算法引擎） + 金额大写');
var _t = function (raw, g) { var r = _kinCompute(raw, g); return r.titles.join('／'); };
ok(_t('哥哥的哥哥', 'male') === '哥哥', '哥哥的哥哥 → 哥哥');
ok(_t('弟弟的哥哥', 'male') === '哥哥／弟弟', '弟弟的哥哥 → 哥哥／弟弟（排除自己）');
ok(_kinCompute('弟弟的哥哥', 'male').self === true, '弟弟的哥哥识别出会绕回自己');
ok(_t('爸爸的姐姐', 'male') === '大姑', '爸爸的姐姐 → 大姑');
ok(_t('爸爸的姐姐的丈夫', 'male') === '大姑丈', '爸爸的姐姐的丈夫 → 大姑丈');
ok(_t('妈妈的妈妈', 'male') === '外婆', '妈妈的妈妈 → 外婆');
ok(_t('老公的妈妈', 'female') === '婆婆', '老公的妈妈 → 婆婆（我的性别=女）');
ok(_t('老婆的弟弟', 'male') === '小舅子', '老婆的弟弟 → 小舅子');
ok(_t('妈妈的姐姐的儿子', 'male') === '姨哥／姨弟', '姨妈的儿子 → 姨哥／姨弟');
ok(_t('爸爸的哥哥的妻子', 'male') === '伯母', '伯伯的妻子 → 伯母');
ok(_t('爸爸的爸爸的哥哥', 'male') === '伯公', '爷爷的哥哥 → 伯公');
ok(_t('爸爸的妈妈的妈妈', 'male') === '曾外祖母', '爸爸的妈妈的妈妈 → 曾外祖母');
ok(_t('丈夫的哥哥', 'female') === '大伯子', '丈夫的哥哥 → 大伯子');
ok(_kinParse('爸爸的姐姐的丈夫').join('-') === '爸爸-姐姐-老公', '手动输入解析正确（丈夫归一为老公）');
ok(_kinCompute('爸爸的姐姐的公公', 'male').ok === false, '不认识的词给引导文案不报错');
ok(_rmbUpper(1234.56) === '壹仟贰佰叁拾肆元伍角陆分', '1234.56 → 壹仟贰佰叁拾肆元伍角陆分');
ok(_rmbUpper(10) === '壹拾元整', '10 → 壹拾元整');
ok(_rmbUpper(0.5) === '伍角整', '0.5 → 伍角整');
ok(_rmbUpper(100.2) === '壹佰元贰角整', '100.2 → 壹佰元贰角整');
ok(_rmbUpper(105.04) === '壹佰零伍元零肆分', '105.04 → 壹佰零伍元零肆分');
ok(_rmbUpper(0) === '零元整', '0 → 零元整');
ok(_rmbUpper(100000000) === '壹亿元整', '1亿 → 壹亿元整');
ok(_rmbUpper(100000100) === '壹亿零壹佰元整', '100000100 → 壹亿零壹佰元整');
ok(_rmbUpper(1000100) === '壹佰万零壹佰元整', '1000100 → 壹佰万零壹佰元整（万位后补零）');

console.log('');
if (failures) { console.log('❌ ' + failures + ' 项断言失败'); process.exit(1); }
else { console.log('✅ 全部断言通过'); }`;

const src = stubs + '\n' + core + '\n' + merge + '\n' + exitSync + '\n' + tools + '\n' + scenarios;
const outFile = path.join(__dirname, '_unread_test_gen.cjs');
fs.writeFileSync(outFile, src, 'utf8');
require(outFile);
