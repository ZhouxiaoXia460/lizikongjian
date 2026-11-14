// 真心话未读角标 + 回复功能 逻辑自测（临时脚本）：从 index.html 抽取核心函数，在 Node 跑场景断言
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function slice(startMarker, endMarker) {
    const a = html.indexOf(startMarker);
    const b = html.indexOf(endMarker, a + 1);
    if (a < 0) throw new Error('找不到起始标记: ' + startMarker);
    if (b < 0) throw new Error('找不到结束标记: ' + endMarker);
    return html.slice(a, b);
}

// 1) 未读核心块（readMarks 体系）
const unreadCore = slice(
    '// ==================== 未读消息（聊天 / 手帐 / 倒数日 / 备忘录 / 真心话） ====================',
    '// ==================== 工具函数 ===================='
);
// 2) 真心话模块全量
const truthCore = slice(
    'const TRUTH_QA_CAP = 150;',
    '// ==================== 退出空间（区别于解散：只退出自己，云端空间与数据原样保留） ===================='
);
// 3) mergeCloudSnapshot（含 truthQA replies 合并 + readMarks 合并）
const mergeCore = slice(
    '// ==================== 动态保留期（省额度） ====================',
    '// ==================== 后台自动双向同步 ===================='
);

// —— 沙箱 stub ——
const els = {}; // 假 DOM 元素池
function fakeEl(id) {
    if (!els[id]) els[id] = {
        id, innerHTML: '', textContent: '', value: '', style: {},
        classList: {
            _s: new Set(),
            add(c) { this._s.add(c); },
            remove(c) { this._s.delete(c); },
            toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (f) { this._s.add(c); } else { this._s.delete(c); } },
            contains(c) { return this._s.has(c); }
        }
    };
    return els[id];
}
const sandbox = {
    console, Date, Math, JSON, Promise, parseInt, String, Number, Boolean, Array, Object, Set, Map, RegExp, Error,
    isNaN, parseFloat, encodeURIComponent, decodeURIComponent,
    localStorage: { _s: {}, getItem(k) { return (k in this._s) ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } },
    document: { getElementById: fakeEl, querySelectorAll: () => [], addEventListener() {}, hidden: false, body: { setAttribute() {} } },
    window: { addEventListener() {}, __activeTab: 'home' },
    navigator: {},
    appData: null,
    TCB_CONFIG: { enabled: false },
    CloudSync: { state: {}, pull: () => Promise.resolve({ ok: false }) },
    showToast() {}, addActivity() {}, addEventListener() {},
    confirm: () => true, alert() {}, setTimeout() {}, clearInterval() {}, setInterval() { return 0; },
    refreshBottomNavTheme() {}, renderHomePage() {}, renderChatPage() {}, renderJournalList() {},
    renderAccountPage() {}, renderCountdownList() {}, renderMemoLists() {}, renderSettingsPage() {},
    renderCloudSyncDiagnostics() {}, renderAvatar: () => '<i class="avatar"></i>',
    escapeHtml: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    formatTime: () => '刚刚', getCurrentUser() { return sandbox.appData.users[sandbox.appData.currentUserId]; },
    maybeDailyOnlineCheckin() {}, startAutoSync() {}, truthLoadCloudBank() {}, loveQuotesLoadCloud() {},
    showPage() {}, switchTab() {}, _captureVisibleEditorDrafts() {}, initAvatarPickersDefault() {},
    _renderHomeCabinCard() {}, fitChatInputBar() {},
    TRUTH_CATS: [ // 渲染 smoke 用，与线上结构一致即可
        { id: 'c1', emoji: '🍡', name: '日常' }, { id: 'c2', emoji: '📷', name: '回忆' },
        { id: 'c3', emoji: '🎈', name: '未来' }, { id: 'c4', emoji: '🌙', name: '走心' },
        { id: 'c5', emoji: '🍄', name: '脑洞' }, { id: 'c6', emoji: '🍬', name: '真心话' }
    ],
    TRUTH_STICKERS: ['🍓', '🌸'],
    truthQB: () => ({}),
    __saved: 0,
};
sandbox.saveData = function () { sandbox.__saved++; };
sandbox.window = sandbox;
sandbox.S = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function run(name, code) {
    try { vm.runInContext(code, sandbox, { filename: name }); return true; }
    catch (e) { console.error('❌ 执行失败 [' + name + ']:', e.message); console.error(e.stack.split('\n').slice(0, 4).join('\n')); process.exit(1); }
}
run('unread-core', unreadCore);
run('truth-core', truthCore);
run('merge-core', mergeCore);

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log('  ✓ ' + msg); }
    else { fail++; console.error('  ✗ ' + msg); }
}
const S = sandbox;
const evalc = (code) => vm.runInContext(code, sandbox);

function freshSpace(opts) {
    opts = opts || {};
    const base = Date.now();
    S.__saved = 0;
    delete els.truthNewDot; delete els.truthHomeDot; // 重建假元素
    S.appData = {
        spaceId: 'space_t', currentUserId: 'u1',
        users: { u1: { id: 'u1', nickname: '栗子' }, u2: { id: 'u2', nickname: '宝贝' } },
        messages: [], journals: [], countdowns: [], memoLists: [], activities: [],
        truthQA: [], truthCustom: [],
        tombstones: {},
        readMarks: {}
    };
    return base;
}

console.log('--- 场景 A：老用户迁移（历史内容不批量变未读） ---');
{
    const T0 = freshSpace();
    // 对方两天前写过一条记录 + 一条回复，本地从未打开过真心话（无 localStorage seen、无 readMarks）
    S.appData.truthQA.push({
        id: 'rec_a', q: '题A', cat: 'c1', createdBy: 'u2', createdTime: T0 - 2 * 86400000,
        answers: { u2: { text: '旧回答', time: T0 - 2 * 86400000 } },
        replies: [{ id: 'rpa', userId: 'u2', userName: '宝贝', text: '旧回复', time: T0 - 86400000 }]
    });
    const n = evalc('_truthUnreadCount()');
    assert(n === 0, '迁移后历史记录+旧回复不算未读（got ' + n + '）');
    const truthAt = evalc('_truthSeenTs()');
    assert(truthAt >= T0 - 86400000, 'truthAt 已迁移到旧内容最新时间');
}

console.log('--- 场景 B：对方新记录 → 角标数字 +1；进历史（markTruthRead）→ 清零 ---');
{
    const T0 = freshSpace();
    S.appData.readMarks.u1 = { _initAt: T0 - 1000, chatAt: 0, truthAt: T0 - 1000, jRead: {}, cdSeen: {}, memoSeen: {} };
    // 基线已读；对方刚答了一道题
    S.appData.truthQA.push({ id: 'rec_b', q: '题B', cat: 'c1', createdBy: 'u2', createdTime: T0 - 500, answers: { u2: { text: '答', time: T0 - 500 } } });
    assert(evalc('_truthUnreadCount()') === 1, '对方新记录算 1 条未读');
    assert(evalc('truthState._histPreMark = 0, true') === true, '准备历史视图');
    evalc('truthState._histPreMark = _truthSeenTs()');
    assert(evalc('_truthRecUnread(S.appData.truthQA[0], truthState._histPreMark).rec') === true, '记录级「新」标记判定成立');
    evalc('markTruthRead()');
    assert(evalc('_truthUnreadCount()') === 0, 'markTruthRead 后未读清零');
    assert(evalc('truthState._histPreMark') < S.appData.readMarks.u1.truthAt, '渲染水位早于已读线（列表还能显示「新」）');
}

console.log('--- 场景 C：对方新回复（回复旧记录）→ 未读 +1；自己的回复不计 ---');
{
    const T0 = freshSpace();
    S.appData.readMarks.u1 = { _initAt: T0, chatAt: 0, truthAt: T0, jRead: {}, cdSeen: {}, memoSeen: {} };
    S.appData.truthQA.push({ id: 'rec_c', q: '题C', cat: 'c2', createdBy: 'u1', createdTime: T0 - 9000, answers: { u1: { text: '我的回答', time: T0 - 9000 } } });
    assert(evalc('_truthUnreadCount()') === 0, '对方还没动作时无未读');
    // TA 回复了我的回答
    S.appData.truthQA[0].replies = [{ id: 'rpc1', userId: 'u2', userName: '宝贝', text: 'TA的回复', time: T0 + 700 }];
    assert(evalc('_truthUnreadCount()') === 1, '对方的新回复算未读（got ' + evalc('_truthUnreadCount()') + '）');
    const ui = evalc('truthState._histPreMark = _truthSeenTs(), _truthRecUnread(S.appData.truthQA[0], truthState._histPreMark)');
    assert(ui.rp === 1 && ui.un === true && ui.rec === false, '记录级未读 = 1 条新回复、记录本身不标新');
    // 我自己回复不产生未读
    S.appData.truthQA[0].replies.push({ id: 'rpc2', userId: 'u1', userName: '栗子', text: '我的回复', time: T0 + 800 });
    assert(evalc('_truthUnreadCount()') === 1, '自己的回复不计未读');
    evalc('markTruthRead()');
    assert(evalc('_truthUnreadCount()') === 0, '进历史后全部清零');
}

console.log('--- 场景 D：云合并 —— 对方设备推来新记录/新回复 → 未读立刻可见 ---');
{
    const T0 = freshSpace();
    S.appData.readMarks.u1 = { _initAt: T0, chatAt: 0, truthAt: T0, jRead: {}, cdSeen: {}, memoSeen: {} };
    const tNew = T0 + 2000; // 对方在我上次已读线之后写的
    const remote = {
        truthQA: [{
            id: 'rec_d1', q: 'TA的新题', cat: 'c1', createdBy: 'u2', createdTime: tNew,
            answers: { u2: { text: 'TA的回答', time: tNew } },
            replies: [{ id: 'rpd1', userId: 'u2', userName: '宝贝', text: 'TA的回复', time: tNew + 10 }]
        }],
        readMarks: { u2: { _initAt: T0, chatAt: 0, truthAt: T0, jRead: {}, cdSeen: {}, memoSeen: {} } }
    };
    const changed = evalc('mergeCloudSnapshot(' + JSON.stringify(remote) + ')');
    assert(changed === true, '合并报告有变化');
    assert(S.appData.truthQA.length === 1 && S.appData.truthQA[0].id === 'rec_d1', '新记录并入本地');
    const n = evalc('_truthUnreadCount()');
    assert(n === 2, '对方新记录+新回复 = 2 条未读（got ' + n + '）');
    // 我点进历史 → 清零
    evalc('truthState._histPreMark = _truthSeenTs()');
    evalc('markTruthRead()');
    assert(evalc('_truthUnreadCount()') === 0, '进历史清零');
    // readMarks 合并：u2 的 truthAt 取最大
    evalc('S.appData.readMarks.u2.truthAt = 1');
    evalc('mergeCloudSnapshot(' + JSON.stringify({ readMarks: { u2: { truthAt: 88888 } } }) + ')');
    assert(S.appData.readMarks.u2.truthAt === 88888, 'readMarks.truthAt 按用户取最大值合并');
}

console.log('--- 场景 E：replies 合并补缺 + 删除墓碑不复活 ---');
{
    const T0 = freshSpace();
    S.appData.readMarks.u1 = { _initAt: T0, chatAt: 0, truthAt: T0, jRead: {}, cdSeen: {}, memoSeen: {} };
    S.appData.truthQA.push({
        id: 'rec_e', q: '题E', cat: 'c1', createdBy: 'u2', createdTime: T0 - 100,
        answers: { u2: { text: '答', time: T0 - 100 } },
        replies: [{ id: 'rpe1', userId: 'u1', userName: '栗子', text: '我的回复', time: T0 - 50 }]
    });
    // 我删了自己的回复 rpe1 → 记墓碑
    evalc('truthDeleteReply("rec_e", "rpe1")');
    assert(S.appData.truthQA[0].replies.length === 0, '删除后本地回复为空');
    assert((S.appData.tombstones.truthReplies || []).indexOf('rpe1') >= 0, '删除记入 truthReplies 墓碑');
    // 对方设备还没收到删除，推回了包含 rpe1 的旧数据 + 一条 TA 的新回复
    const remote = {
        truthQA: [{
            id: 'rec_e', q: '题E', cat: 'c1', createdBy: 'u2', createdTime: T0 - 100,
            answers: { u2: { text: '答', time: T0 - 100 } },
            replies: [
                { id: 'rpe1', userId: 'u1', userName: '栗子', text: '我的回复', time: T0 - 50 },
                { id: 'rpe2', userId: 'u2', userName: '宝贝', text: 'TA的新回复', time: T0 + 300 }
            ]
        }]
    };
    evalc('mergeCloudSnapshot(' + JSON.stringify(remote) + ')');
    const rps = S.appData.truthQA[0].replies;
    assert(rps.length === 1 && rps[0].id === 'rpe2', '墓碑里的 rpe1 不复活，TA 的新回复并入（got ' + rps.map(x => x.id).join(',') + '）');
}

console.log('--- 场景 F：回复发送链路（目标回复 + 渲染） ---');
{
    const T0 = freshSpace();
    S.appData.readMarks.u1 = { _initAt: T0, chatAt: 0, truthAt: T0, jRead: {}, cdSeen: {}, memoSeen: {} };
    S.appData.truthQA.push({
        id: 'rec_f', q: '题F', cat: 'c1', createdBy: 'u2', createdTime: T0 - 100,
        answers: { u2: { text: 'TA的回答', time: T0 - 100 } },
        replies: []
    });
    evalc('truthState._histPreMark = _truthSeenTs()');
    // 点 TA 回答上的「回复」→ 目标名取自数据
    evalc('truthSetReply("rec_f", "ans_u2")');
    assert(evalc('truthState.reply.toName') === '宝贝', '回复目标名 = 回答者昵称');
    evalc('truthSetReply("rec_f", "ans_u2")');
    els['truthReplyInput_rec_f'].value = '  你好呀  ';
    evalc('truthSendReply("rec_f")');
    let rps = S.appData.truthQA[0].replies;
    assert(rps.length === 1 && rps[0].text === '你好呀' && rps[0].userId === 'u1', '回复已写入记录（trim 生效）');
    assert(rps[0].replyTo && rps[0].replyTo.name === '宝贝', '回复带上 replyTo=@宝贝');
    assert(rps[0].userName === '栗子', '回复者昵称正确');
    assert((rps[0].id + '').indexOf('trp_') === 0, '回复 id 前缀 trp_');
    // 回复回复内容：目标 = 某条 reply
    evalc('truthSetReply("rec_f", "' + rps[0].id + '")');
    assert(evalc('truthState.reply.toName') === '栗子', '回复回复时目标名 = 该回复者昵称');
    els['truthReplyInput_rec_f'].value = '再回复一条';
    evalc('truthSendReply("rec_f")');
    rps = S.appData.truthQA[0].replies;
    assert(rps.length === 2 && rps[1].replyTo.id === rps[0].id, '回复的回复 replyTo 指向被回复的 reply');
    // 空内容拦截
    els['truthReplyInput_rec_f'].value = '   ';
    evalc('truthSendReply("rec_f")');
    assert(S.appData.truthQA[0].replies.length === 2, '空回复被拦截');
    // 渲染 smoke：历史列表应含回复按钮/新标记/回复输入框
    evalc('truthRenderHistory()');
    const h = els['truthHistoryList'].innerHTML;
    assert(h.indexOf('回复') >= 0, '历史渲染含回复按钮');
    assert(h.indexOf('↩ 回复 @') >= 0, '历史渲染含回复目标行');
    assert(h.indexOf('truthReplyBox_rec_f') >= 0, '历史渲染含内嵌回复输入框');
    assert(h.indexOf('truthSetReply') >= 0 && h.indexOf('truthSendReply') >= 0, '按钮已绑定处理函数');
    // 未读筛选
    S.appData.truthQA[0].replies[1].time = T0 + 9999; // 我自己的回复不算，给 TA 塞一条新的
    S.appData.truthQA[0].replies.push({ id: 'rpf3', userId: 'u2', userName: '宝贝', text: 'TA又回了', time: T0 + 10000 });
    evalc('truthSetHistFilter("unread")');
    const hu = els['truthHistoryList'].innerHTML;
    assert(hu.indexOf('题F') >= 0, '未读筛选下含未读记录');
    assert(hu.indexOf('💬 1 条新回复') >= 0, '未读筛选下显示 N 条新回复 chip');
    evalc('truthSetHistFilter("all")');
    // 未读都看完后的空态：点进历史（markTruthRead 推进水位）→ 下次渲染以新水位判定 → 未读筛选项为空
    evalc('markTruthRead()');
    evalc('truthState._histPreMark = _truthSeenTs()');
    evalc('truthSetHistFilter("unread")');
    assert(els['truthHistoryList'].innerHTML.indexOf('未读都看完啦') >= 0, '无未读时筛选显示友好空态');
}

console.log('--- 场景 G：徽章 DOM 更新（99+ 与清零） ---');
{
    const T0 = freshSpace();
    S.appData.readMarks.u1 = { _initAt: T0, chatAt: 0, truthAt: T0, jRead: {}, cdSeen: {}, memoSeen: {} };
    for (let i = 0; i < 120; i++) {
        S.appData.truthQA.push({ id: 'rec_g' + i, q: '题' + i, cat: 'c1', createdBy: 'u2', createdTime: T0 + i + 1, answers: {} });
    }
    evalc('truthUpdateBadge()');
    assert(els.truthNewDot.textContent === '99+' && els.truthHomeDot.textContent === '99+', '超过 99 条显示 99+');
    assert(!els.truthNewDot.classList.contains('hidden'), '有未读时角标显示');
    evalc('markTruthRead()');
    assert(evalc('_truthUnreadCount()') === 0, '进历史清零');
    assert(els.truthNewDot.classList.contains('hidden') && els.truthHomeDot.classList.contains('hidden'), '清零后角标隐藏');
}

console.log('');
console.log('结果: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
