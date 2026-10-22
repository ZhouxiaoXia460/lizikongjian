
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
var saveCalls = 0;
function saveData(){ saveCalls++; window.__liziLastSaveAt = Date.now(); localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }
function showToast(){}
var appData;

// ==================== 未读消息（聊天 / 手帐 / 倒数日 / 备忘录） ====================
        // 已读标记按用户存放在 appData.readMarks[uid]，随云快照双向同步：
        //   chatAt   聊天已读水位线（打开聊天页即推进到现在）
        //   jRead    { 手帐id: 已读时间戳 }（打开手帐详情即写入；TA 的新手帐/新留言都会让该篇变未读）
        //   cdSeen   { 倒数日id: 已见时间戳 }（倒数日无作者字段，用“见过集合”判断）
        //   memoSeen { 清单/条目id: 已见时间戳 }（备忘条目同样无作者字段）
        // 双端合并策略：按用户取最大时间戳（每人只写自己的标记，取并集即安全）

        // 老用户升级迁移：第一次运行时把现有内容全部记为已读，避免把历史内容全标成未读
        function _initReadMarksIfNeeded() {
            if (!appData.spaceId || !appData.currentUserId) return;
            appData.readMarks = (appData.readMarks && typeof appData.readMarks === 'object') ? appData.readMarks : {};
            const uid = appData.currentUserId;
            if (appData.readMarks[uid] && appData.readMarks[uid]._initAt) return;
            const now = Date.now();
            // 水位线/已读线取「现有内容的最新时间戳」与当下时钟的较大值：对方设备时钟略快时也不会留下清不掉的红点
            let newestMsg = 0;
            (appData.messages || []).forEach(msg => { if (msg && (msg.time || 0) > newestMsg) newestMsg = msg.time || 0; });
            const m = { _initAt: now, chatAt: Math.max(now, newestMsg), jRead: {}, cdSeen: {}, memoSeen: {} };
            (appData.journals || []).forEach(j => {
                if (!j || !j.id) return;
                let newest = j.createTime || 0;
                (j.comments || []).forEach(c => { if (c && (c.time || 0) > newest) newest = c.time || 0; });
                m.jRead[j.id] = Math.max(now, newest);
            });
            (appData.countdowns || []).forEach(c => { if (c && c.id) m.cdSeen[c.id] = now; });
            (appData.memoLists || []).forEach(l => {
                if (!l || !l.id) return;
                m.memoSeen[l.id] = now;
                (l.items || []).forEach(it => { if (it && it.id) m.memoSeen[it.id] = now; });
            });
            appData.readMarks[uid] = m;
            saveData();
        }

        // 取当前用户的已读标记（自动补齐字段）
        function _myReadMarks() {
            if (!appData.readMarks || typeof appData.readMarks !== 'object') appData.readMarks = {};
            const uid = appData.currentUserId;
            if (!uid) return { _initAt: 0, chatAt: 0, jRead: {}, cdSeen: {}, memoSeen: {} };
            _initReadMarksIfNeeded();
            const m = appData.readMarks[uid];
            if (!m || typeof m !== 'object') {
                appData.readMarks[uid] = { _initAt: Date.now(), chatAt: 0, jRead: {}, cdSeen: {}, memoSeen: {} };
                return appData.readMarks[uid];
            }
            if (typeof m.chatAt !== 'number') m.chatAt = 0;
            if (!m.jRead || typeof m.jRead !== 'object') m.jRead = {};
            if (!m.cdSeen || typeof m.cdSeen !== 'object') m.cdSeen = {};
            if (!m.memoSeen || typeof m.memoSeen !== 'object') m.memoSeen = {};
            return m;
        }

        // 已读标记瘦身：清掉指向已删除内容的条目并限制容量，防止无限膨胀
        function _pruneReadMarks() {
            try {
                const m = _myReadMarks();
                const cap = function (obj, aliveSet, max) {
                    let keys = Object.keys(obj).filter(id => aliveSet.has(id));
                    if (keys.length > max) { keys.sort((a, b) => (obj[a] || 0) - (obj[b] || 0)); keys = keys.slice(-max); }
                    const next = {}; keys.forEach(id => { next[id] = obj[id]; });
                    return next;
                };
                const jIds = new Set((appData.journals || []).map(j => j && j.id).filter(Boolean));
                m.jRead = cap(m.jRead, jIds, 400);
                const cIds = new Set((appData.countdowns || []).map(c => c && c.id).filter(Boolean));
                m.cdSeen = cap(m.cdSeen, cIds, 400);
                const mIds = new Set();
                (appData.memoLists || []).forEach(l => { if (l && l.id) { mIds.add(l.id); (l.items || []).forEach(it => { if (it && it.id) mIds.add(it.id); }); } });
                m.memoSeen = cap(m.memoSeen, mIds, 800);
            } catch (e) {}
        }

        // 当前未读统计（导航徽章与页面筛选用）
        function getUnreadInfo() {
            const info = { chat: 0, journal: 0, journalComments: 0, countdown: 0, memo: 0, journalIds: [], cdIds: [], memoIds: [] };
            const uid = appData.currentUserId;
            if (!uid || !appData.spaceId) return info;
            const m = _myReadMarks();
            (appData.messages || []).forEach(msg => {
                if (msg && msg.senderId && msg.senderId !== uid && (msg.time || 0) > (m.chatAt || 0)) info.chat++;
            });
            (appData.journals || []).forEach(j => {
                const ui = _journalUnreadInfo(j);
                if (ui.un) { info.journal++; info.journalComments += ui.cmt; info.journalIds.push(j.id); }
            });
            (appData.countdowns || []).forEach(c => {
                if (c && c.id && !m.cdSeen[c.id]) { info.countdown++; info.cdIds.push(c.id); }
            });
            (appData.memoLists || []).forEach(l => {
                if (!l || !l.id) return;
                if (!m.memoSeen[l.id]) { info.memo++; info.memoIds.push(l.id); return; } // 新清单整张算 1 条未读
                (l.items || []).forEach(it => { if (it && it.id && !m.memoSeen[it.id]) { info.memo++; info.memoIds.push(it.id); } });
            });
            return info;
        }

        // 单篇手帐的未读状态：TA 新写的手帐，或这篇里 TA 的新留言
        function _journalUnreadInfo(j) {
            const uid = appData.currentUserId;
            const res = { un: false, cmt: 0 };
            if (!j || !j.id || !uid || !appData.spaceId) return res;
            const m = _myReadMarks();
            const mark = (m.jRead && m.jRead[j.id]) || 0;
            if (j.authorId && j.authorId !== uid && (j.createTime || 0) > mark) res.un = true;
            (j.comments || []).forEach(c => {
                if (c && c.userId && c.userId !== uid && (c.time || 0) > mark) { res.un = true; res.cmt++; }
            });
            return res;
        }

        // 所有未读手帐 id（列表“只看未读”筛选用）
        function _journalUnreadIds() {
            const set = new Set();
            (appData.journals || []).forEach(j => { if (j && j.id && _journalUnreadInfo(j).un) set.add(j.id); });
            return set;
        }

        // —— 标记已读 ——
        function markChatRead() {
            const uid = appData.currentUserId;
            if (!uid) return;
            const m = _myReadMarks();
            // 只在有未读时才写（避免聊天页每次重渲染都写盘推送）；
            // 水位线取「当前最新消息时间」而不是当下时钟：对方设备时钟略快时也能把已显示的消息清干净
            const hasUnread = (appData.messages || []).some(msg => msg && msg.senderId && msg.senderId !== uid && (msg.time || 0) > (m.chatAt || 0));
            if (!hasUnread) return;
            let newest = 0;
            (appData.messages || []).forEach(msg => { if (msg && (msg.time || 0) > newest) newest = msg.time || 0; });
            const target = Math.max(Date.now(), newest);
            if (target > (m.chatAt || 0)) {
                m.chatAt = target;
                saveData();
                updateUnreadBadges();
            }
        }

        function markJournalRead(journalId) {
            if (!journalId || !appData.currentUserId) return;
            const m = _myReadMarks();
            // 已读线取「这篇里最新内容的时间」（手帐创建/留言）而不是当下时钟：对方时钟略快也能清干净
            let newest = 0;
            const j = (appData.journals || []).find(x => x && x.id === journalId);
            if (j) {
                newest = j.createTime || 0;
                (j.comments || []).forEach(c => { if (c && (c.time || 0) > newest) newest = c.time || 0; });
            }
            // 直接写：写入幂等，推送有 3 秒节流，不做防抖（避免漏掉紧随其后的新留言）
            m.jRead[journalId] = Math.max(Date.now(), newest);
            _pruneReadMarks();
            saveData();
            updateUnreadBadges();
        }

        // 本次进入“倒数日/备忘录”页以来新出现的内容（会话级集合，切走即清；筛选与 NEW 角标用）
        function _ensureVisitSet(key) {
            if (window.__visitTabKey !== key || !window.__visitUnread) {
                window.__visitTabKey = key;
                window.__visitUnread = new Set();
            }
            return window.__visitUnread;
        }

        // 自己刚创建的内容立即记为已见，避免出现在自己的未读里
        function _markOwnSeenId(mapKey, id) {
            if (!id || !appData.currentUserId) return;
            const m = _myReadMarks();
            m[mapKey][id] = Date.now();
        }

        // 底部导航红点徽章（聊天/手帐/倒数日/备忘录）
        function updateUnreadBadges() {
            let info;
            try { info = getUnreadInfo(); } catch (e) { return; }
            const map = { chat: info.chat, journal: info.journal, countdown: info.countdown, memo: info.memo };
            Object.keys(map).forEach(k => {
                const el = document.getElementById('navUnread-' + k);
                if (!el) return;
                const n = map[k] || 0;
                if (n > 0) {
                    el.textContent = n > 99 ? '99+' : String(n);
                    el.classList.add('show');
                } else {
                    el.classList.remove('show');
                }
            });
        }


// ==================== 动态保留期（省额度） ====================
    // 空间动态只保留最近 7 天，更早的自动删除：本机启动、新增动态、每次云合并时都会清一次，
    // 防止旧快照把过期动态反复带回云端（快照体积与同步流量随之变小）。
    const ACTIVITY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
    function _pruneOldActivities() {
        try {
            if (!Array.isArray(appData.activities)) { appData.activities = []; return 0; }
            const cutoff = Date.now() - ACTIVITY_RETENTION_MS;
            const before = appData.activities.length;
            appData.activities = appData.activities.filter(a => a && (a.time || 0) >= cutoff);
            return before - appData.activities.length;
        } catch (e) { return 0; }
    }

    function mergeCloudSnapshot(remoteData) {
        if (!remoteData || typeof remoteData !== 'object') return false;
        let changed = false;

        // 1. 数组类合并（按 id 去重补缺 + 手账新者胜）
        const arrayKeys = ['messages', 'journals', 'countdowns', 'activities', 'accounts', 'settlements'];
        arrayKeys.forEach(k => {
            if (!Array.isArray(remoteData[k])) return;
            const localArr = Array.isArray(appData[k]) ? appData[k] : [];
            const idMap = new Map(localArr.map(x => [x && x.id, x]));
            let arrChanged = false;
            remoteData[k].forEach(item => {
                if (!item || !item.id) return;
                // 账目墓碑：对方已撤回（删除）的目标存取账目，不再合并回来
                if (k === 'accounts' && Array.isArray(appData.tombstones.accounts) && appData.tombstones.accounts.indexOf(item.id) >= 0) return;
                if (!idMap.has(item.id)) {
                    localArr.push(item);
                    idMap.set(item.id, item);
                    arrChanged = true;
                } else if (k === 'journals' || k === 'countdowns') {
                    // 手账/倒数日：对方更新过（编辑/到期转正都会刷新 updateTime）→ 用远端覆盖本地同 id 版本
                    const localItem = idMap.get(item.id);
                    if ((item.updateTime || 0) > (localItem.updateTime || 0)) {
                        const idx = localArr.indexOf(localItem);
                        if (idx >= 0) localArr[idx] = item;
                        idMap.set(item.id, item);
                        arrChanged = true;
                    }
                }
            });
            if (arrChanged) {
                if (k === 'messages') localArr.sort((a, b) => (a.time || 0) - (b.time || 0));
                else localArr.sort((a, b) => (b.time || b.createTime || 0) - (a.time || a.createTime || 0));
                if (k === 'activities' && localArr.length > 50) localArr.length = 50;
                appData[k] = localArr;
                if (k === 'activities') _pruneOldActivities(); // 合并进来的过期动态就地清理
                changed = true;
            }
        });

        // 1.2 合并真心话问答：按 id 补缺；同 id 记录的 answers 按作答人补缺（谁的新回答都进得来）
        if (Array.isArray(remoteData.truthQA)) {
            const localQA = Array.isArray(appData.truthQA) ? appData.truthQA : [];
            const qaMap = new Map(localQA.map(x => [x && x.id, x]));
            const tombQA = (appData.tombstones && Array.isArray(appData.tombstones.truthQA)) ? appData.tombstones.truthQA : [];
            let qaChanged = false;
            remoteData.truthQA.forEach(item => {
                if (!item || !item.id || !item.q || tombQA.indexOf(item.id) >= 0) return;
                if (!qaMap.has(item.id)) {
                    localQA.push(item);
                    qaMap.set(item.id, item);
                    qaChanged = true;
                } else {
                    const li = qaMap.get(item.id);
                    const ra = (item.answers && typeof item.answers === 'object') ? item.answers : {};
                    Object.keys(ra).forEach(uid => {
                        if (!li.answers || typeof li.answers !== 'object') li.answers = {};
                        if (!li.answers[uid] && ra[uid]) { li.answers[uid] = ra[uid]; qaChanged = true; }
                    });
                }
            });
            if (qaChanged) {
                localQA.sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0));
                if (localQA.length > 150) localQA.length = 150;
                appData.truthQA = localQA;
                changed = true;
            }
        }

        // 1.3 合并二人专属题库：按 id 补缺（删除走墓碑，防止"复活"）
        if (Array.isArray(remoteData.truthCustom)) {
            const localC = Array.isArray(appData.truthCustom) ? appData.truthCustom : [];
            const cSet = new Set(localC.map(x => x && x.id));
            const cTomb = Array.isArray(appData.tombstones && appData.tombstones.truthCustom) ? appData.tombstones.truthCustom : [];
            let cChanged = false;
            remoteData.truthCustom.forEach(item => {
                if (!item || !item.id || !item.q || cTomb.indexOf(item.id) >= 0) return;
                if (!cSet.has(item.id)) { localC.push(item); cSet.add(item.id); cChanged = true; }
            });
            if (cChanged) {
                localC.sort((a, b) => (b.time || 0) - (a.time || 0));
                if (localC.length > 100) localC.length = 100;
                appData.truthCustom = localC;
                changed = true;
            }
        }

        // 1.5 合并删除墓碑：两边取并集（删除操作双方都要知道，防止归档恢复"复活"）
        if (remoteData.tombstones && typeof remoteData.tombstones === 'object') {
            ['messages', 'journals', 'memoLists', 'memoItems', 'accounts', 'goals', 'truthCustom', 'truthQA'].forEach(k => {
                const remote = Array.isArray(remoteData.tombstones[k]) ? remoteData.tombstones[k] : [];
                if (!appData.tombstones) appData.tombstones = { messages: [], journals: [], truthCustom: [] };
                if (!Array.isArray(appData.tombstones[k])) appData.tombstones[k] = [];
                const localSet = new Set(appData.tombstones[k]);
                let tChanged = false;
                remote.forEach(id => { if (id && !localSet.has(id)) { appData.tombstones[k].push(id); localSet.add(id); tChanged = true; } });
                if (tChanged && appData.tombstones[k].length > 1000) appData.tombstones[k].splice(0, appData.tombstones[k].length - 1000);
                if (tChanged) changed = true;
            });
        }

        // 1.4 账目墓碑落地：对方撤回的目标存取账目，本机也一并删除（保证月度收支统计两边一致）
        if (Array.isArray(appData.tombstones.accounts) && appData.tombstones.accounts.length) {
            const tAcc = appData.tombstones.accounts;
            const beforeAcc = (appData.accounts || []).length;
            appData.accounts = (appData.accounts || []).filter(function (a) { return !(a && tAcc.indexOf(a.id) >= 0); });
            if (appData.accounts.length !== beforeAcc) changed = true;
        }

        // 2. 合并 memoLists：补缺清单/条目；同 id 条目的勾选/内容、清单的名称/图标/日期/执行人以云端为准
        if (Array.isArray(remoteData.memoLists)) {
            const tMemoLists = Array.isArray(appData.tombstones.memoLists) ? new Set(appData.tombstones.memoLists) : new Set();
            const tMemoItems = Array.isArray(appData.tombstones.memoItems) ? new Set(appData.tombstones.memoItems) : new Set();
            const localMemoMap = new Map();
            (Array.isArray(appData.memoLists) ? appData.memoLists : []).forEach(l => { if (l && l.id) localMemoMap.set(l.id, l); });
            remoteData.memoLists.forEach(rl => {
                if (!rl || !rl.id || tMemoLists.has(rl.id)) return;
                if (!localMemoMap.has(rl.id)) {
                    if (!appData.memoLists) appData.memoLists = [];
                    appData.memoLists.push(rl);
                    localMemoMap.set(rl.id, rl);
                    changed = true;
                    return;
                }
                const ll = localMemoMap.get(rl.id);
                // 更新时间新者胜：本机刚编辑过（updatedAt 更新）时不被旧云快照回滚；老数据无时间戳则维持云端为准
                const remoteNewer = (rl.updatedAt || 0) >= (ll.updatedAt || 0);
                if (remoteNewer && ((rl.name && rl.name !== ll.name) || (rl.icon && rl.icon !== ll.icon) || (rl.date || '') !== (ll.date || '') || (rl.owner || 'both') !== (ll.owner || 'both'))) {
                    ll.name = rl.name || ll.name;
                    ll.icon = rl.icon || ll.icon;
                    ll.date = rl.date || '';
                    ll.owner = rl.owner || 'both';
                    ll.updatedAt = rl.updatedAt || ll.updatedAt;
                    changed = true;
                }
                const itemMap = new Map(((ll && ll.items) || []).map(x => [x && x.id, x]));
                (rl.items || []).forEach(it => {
                    if (!it || !it.id || tMemoItems.has(it.id)) return;
                    if (!itemMap.has(it.id)) {
                        if (!ll.items) ll.items = [];
                        ll.items.push(it);
                        itemMap.set(it.id, it);
                        changed = true;
                    } else {
                        const li = itemMap.get(it.id);
                        const itemRemoteNewer = (it.updatedAt || 0) >= (li.updatedAt || 0);
                        if (itemRemoteNewer && it.completed !== li.completed) {
                            li.completed = it.completed;
                            changed = true;
                        }
                        if (itemRemoteNewer && it.content && it.content !== li.content) {
                            li.content = it.content;
                            changed = true;
                        }
                    }
                });
            });
            // 墓碑落地：对方删除的清单/条目，本机也一并删掉
            if (tMemoLists.size) {
                const before = appData.memoLists.length;
                appData.memoLists = appData.memoLists.filter(l => !(l && tMemoLists.has(l.id)));
                if (appData.memoLists.length !== before) changed = true;
            }
            if (tMemoItems.size) {
                appData.memoLists.forEach(l => {
                    if (!l || !Array.isArray(l.items)) return;
                    const b = l.items.length;
                    l.items = l.items.filter(i => !(i && tMemoItems.has(i.id)));
                    if (l.items.length !== b) changed = true;
                });
            }
        }

        // 3. 合并 users：本地缺的补上；对方「已加入」的状态和资料也要从远端同步下来
        if (remoteData.users && typeof remoteData.users === 'object') {
            if (!appData.users || typeof appData.users !== 'object') appData.users = {};
            Object.keys(remoteData.users).forEach(uid => {
                const ru = remoteData.users[uid];
                if (!ru) return;
                if (!appData.users[uid]) {
                    appData.users[uid] = ru;
                    changed = true;
                    return;
                }
                const lu = appData.users[uid];
                if (uid !== appData.currentUserId && ru.joined && !lu.joined) {
                    appData.users[uid] = ru;
                    changed = true;
                }
            });
        }

        // 4. 基础信息只在本地为空时采用远端（加入空间的场景）
        if (!appData.spaceId && remoteData.spaceId) { appData.spaceId = remoteData.spaceId; changed = true; }
        if (!appData.inviteCode && remoteData.inviteCode) { appData.inviteCode = remoteData.inviteCode; changed = true; }
        if ((!appData.spaceName || appData.spaceName === '我们的小天地') && remoteData.spaceName) { appData.spaceName = remoteData.spaceName; changed = true; }
        // 在一起的日子：带时间戳新者胜（一方改了，另一方自动跟；都没时间戳则保持本地，避免老数据来回覆盖）
        if (remoteData.togetherDate) {
            const remoteTs = remoteData.togetherDateUpdatedAt || 0;
            const localTs = appData.togetherDateUpdatedAt || 0;
            if (!appData.togetherDate || (remoteTs > 0 && remoteTs > localTs)) {
                if (appData.togetherDate !== remoteData.togetherDate) {
                    appData.togetherDate = remoteData.togetherDate;
                    appData.togetherDateUpdatedAt = remoteTs || Date.now();
                    changed = true;
                }
            }
        }

        // 5. 下次见面约定：整块按 updatedAt 新者胜（双方都能改，最近一次设置生效）
        if (remoteData.nextMeeting && remoteData.nextMeeting.date) {
            const localNM = appData.nextMeeting;
            if (!localNM || !localNM.date || (remoteData.nextMeeting.updatedAt || 0) > (localNM.updatedAt || 0)) {
                appData.nextMeeting = remoteData.nextMeeting;
                changed = true;
            }
        }

        // 6. 攒钱目标：按 id 合并，同一目标按 updatedAt 新者胜（双方都能存钱/取出）
        if (Array.isArray(remoteData.savingGoals)) {
            if (!Array.isArray(appData.savingGoals)) appData.savingGoals = [];
            if (!Array.isArray(appData.tombstones.goals)) appData.tombstones.goals = [];
            const goalGone = function (id) { return appData.tombstones.goals.indexOf(id) >= 0; };
            // 目标墓碑落地：对方删除的目标，本机也一并删除
            const beforeGoals = appData.savingGoals.length;
            appData.savingGoals = appData.savingGoals.filter(g => !(g && goalGone(g.id)));
            if (appData.savingGoals.length !== beforeGoals) changed = true;
            remoteData.savingGoals.forEach(rg => {
                if (!rg || !rg.id || goalGone(rg.id)) return;
                const local = appData.savingGoals.find(g => g && g.id === rg.id);
                if (!local) {
                    appData.savingGoals.push(rg);
                    changed = true;
                } else if ((rg.updatedAt || 0) > (local.updatedAt || 0)) {
                    const idx = appData.savingGoals.indexOf(local);
                    if (idx >= 0) { appData.savingGoals[idx] = rg; changed = true; }
                }
            });
        }

        // 7. TA的备忘册：按所属人整本比较 updatedAt，新者胜（手动保存模型，不做逐字段合并）
        if (remoteData.memoBook && typeof remoteData.memoBook === 'object') {
            if (!appData.memoBook || typeof appData.memoBook !== 'object') appData.memoBook = {};
            ['lizi', 'shizi'].forEach(o => {
                const rm = remoteData.memoBook[o];
                if (!rm || !Array.isArray(rm.cats)) return;
                const lm = appData.memoBook[o];
                if (!lm || !Array.isArray(lm.cats) || ((rm.updatedAt || 0) > (lm.updatedAt || 0))) {
                    appData.memoBook[o] = JSON.parse(JSON.stringify(rm));
                    changed = true;
                }
            });
        }

        // 7.5 动态保留期检查：无论本次合并有没有新内容，都清一次过期动态（防旧快照反复带回，省额度）
        if (appData.activities && appData.activities.length && _pruneOldActivities() > 0) changed = true;

        // 8. 合并未读已读标记：按用户取最大时间戳（每人只写自己的标记，跨设备取并集即安全）
        if (remoteData.readMarks && typeof remoteData.readMarks === 'object') {
            if (!appData.readMarks || typeof appData.readMarks !== 'object') appData.readMarks = {};
            Object.keys(remoteData.readMarks).forEach(uid => {
                const rm = remoteData.readMarks[uid];
                if (!rm || typeof rm !== 'object') return;
                if (!appData.readMarks[uid] || typeof appData.readMarks[uid] !== 'object') appData.readMarks[uid] = {};
                const lm = appData.readMarks[uid];
                let rChanged = false;
                if ((rm.chatAt || 0) > (lm.chatAt || 0)) { lm.chatAt = rm.chatAt; rChanged = true; }
                ['jRead', 'cdSeen', 'memoSeen'].forEach(k => {
                    const rmap = rm[k];
                    if (!rmap || typeof rmap !== 'object') return;
                    if (!lm[k] || typeof lm[k] !== 'object') lm[k] = {};
                    Object.keys(rmap).forEach(id => {
                        if ((rmap[id] || 0) > (lm[k][id] || 0)) { lm[k][id] = rmap[id]; rChanged = true; }
                    });
                });
                if (rChanged) changed = true;
            });
        }

        return changed;
    }


// ==================== 退出时自动同步（切后台/关页面都补一次“拉合并→推送”） ====================
    // 原理：页面卸载阶段只有同步 XHR 能可靠完成网络请求，所以退出通道用 async=false 的 XHR：
    // 先把云端最新快照拉下来合并（防止用旧数据覆盖对方刚推的内容），再把本机全集推回去。
    // 只在本机有“尚未同步到云端”的改动时才发流量；失败完全静默，不影响退出，下次打开 autoSyncTick 会补。
    let _exitSyncAt = 0;
    function exitSyncFlush() {
        try {
            if (!TCB_CONFIG.enabled || !TCB_CONFIG.publishKey) return;
            if (!appData || !appData.spaceId || !appData.currentUserId) return;
            if (typeof CloudSync === 'undefined' || !CloudSync._gatewayObjectUrl) return;
            const now = Date.now();
            if (now - _exitSyncAt < 4000) return; // 4 秒内多次触发（pagehide+beforeunload 等）只执行一次
            _exitSyncAt = now;
            const lastSave = window.__liziLastSaveAt || 0;
            const lastSync = (CloudSync.state && CloudSync.state.lastSyncAt) || 0;
            if (lastSave && lastSync && lastSave <= lastSync) return; // 没有未同步的改动，不花流量
            const url = CloudSync._gatewayObjectUrl(CloudSync._snapshotCloudPath(appData.spaceId));
            const auth = CloudSync._gwAuthHeader();

            // 1) 同步拉取云端快照并合并（对方可能刚推过新数据）
            try {
                const xr = new XMLHttpRequest();
                xr.open('GET', url, false);
                xr.setRequestHeader('Authorization', auth);
                try { xr.setRequestHeader('Cache-Control', 'no-store'); } catch (he) {}
                xr.send(null);
                if (xr.status === 200 && xr.responseText) {
                    const snap = JSON.parse(xr.responseText);
                    const remote = (snap && snap.payload) ? snap.payload : snap;
                    if (remote && typeof remote === 'object' && mergeCloudSnapshot(remote)) {
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); } catch (le) {}
                    }
                }
            } catch (pe) { /* 拉取失败不影响推送 */ }

            // 2) 同步推送本机全集（与 CloudSync.push 相同的快照结构与截断规则）
            let payloadData = appData;
            const maxSync = parseInt(TCB_CONFIG.cloudMaxMessages || '500', 10);
            const truncArr = function (arr, field) { return arr.slice().sort(function (a, b) { return (a[field] || 0) - (b[field] || 0); }).slice(-maxSync); };
            const patch = {};
            if (Array.isArray(appData.messages) && appData.messages.length > maxSync) patch.messages = truncArr(appData.messages, 'time');
            if (Array.isArray(appData.accounts) && appData.accounts.length > maxSync) patch.accounts = truncArr(appData.accounts, 'createTime');
            if (Object.keys(patch).length) payloadData = Object.assign({}, appData, patch, { _truncated: true });
            const snapshot = {
                _type: 'lizi-space-snapshot',
                _version: 1,
                _updatedAt: Date.now(),
                _updatedBy: (CloudSync._userId || appData.currentUserId || 'anonymous'),
                payload: payloadData
            };
            const body = JSON.stringify(snapshot);
            const xp = new XMLHttpRequest();
            xp.open('POST', url, false);
            xp.setRequestHeader('Authorization', auth);
            xp.setRequestHeader('Content-Type', 'application/json');
            xp.setRequestHeader('x-upsert', 'true');
            xp.send(body);
            if (xp.status >= 200 && xp.status < 300) {
                _netBytesAdd('up', body.length);
                if (CloudSync.state) {
                    CloudSync.state.lastSyncAt = Date.now();
                    if (CloudSync.state.diagnostics) { CloudSync.state.diagnostics.lastPushOk = true; CloudSync.state.diagnostics.lastPushAt = Date.now(); }
                }
            }
        } catch (e) { /* 退出同步失败静默，不影响退出 */ }
    }

    // 退出同步钩子：只装一次
    function installExitSyncHooks() {
        if (window.__liziExitSyncHooks) return;
        window.__liziExitSyncHooks = true;
        try { document.addEventListener('visibilitychange', function () { if (document.hidden) exitSyncFlush(); }); } catch (e) {}
        try { window.addEventListener('pagehide', function () { exitSyncFlush(); }); } catch (e) {}
        try { window.addEventListener('beforeunload', function () { exitSyncFlush(); }); } catch (e) {}
    }

    // ==================== 进入空间自动同步一次 ====================
    // 每次打开应用进入空间 / 创建或加入空间后：等云连接就绪，立即做一次拉取→合并→（有变化）推回，
    // 让开机头几秒就能看到对方的新内容、刷新未读红点；10 秒内多次进入只同步一次。
    let _enterSyncAt = 0;
    async function enterSpaceSync() {
        try {
            if (!TCB_CONFIG.enabled || !appData || !appData.spaceId || !appData.currentUserId) return;
            const now = Date.now();
            if (now - _enterSyncAt < 10000) return;
            _enterSyncAt = now;
            // 启动流程里的 init（800ms 后）可能还在进行：等它完成，避免并发重复登录；等不到再自己兜底
            let waited = 0;
            while (!CloudSync.state.initialized && CloudSync.state.status === 'initializing' && waited < 8000) {
                await new Promise(r => setTimeout(r, 300));
                waited += 300;
            }
            if (!CloudSync.state.initialized) {
                const r = await CloudSync.init();
                if (!r || (!r.ok && !r.pseudoMode)) return;
            }
            await autoSyncTick();
        } catch (e) { try { console.warn('[进入同步]', (e && e.message) || e); } catch (e2) {} }
    }



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

console.log('');
if (failures) { console.log('❌ ' + failures + ' 项断言失败'); process.exit(1); }
else { console.log('✅ 全部断言通过'); }