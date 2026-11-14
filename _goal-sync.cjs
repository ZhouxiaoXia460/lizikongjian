const fs = require('fs');
const f = 'C:/Users/admin/Desktop/VS/HTML/栗子空间/kongjian.html';
let c = fs.readFileSync(f, 'utf8');
const NL = c.includes('\r\n') ? '\r\n' : '\n';
const norm = s => s.replace(/\n/g, NL);
let log = [];

// —— 1. 在 _goalTombstoneAcc 后插入撤销辅助函数 ——
if (!c.includes('function _revokeGoalOperation(')) {
  const anchor = norm(`        if (appData.tombstones.accounts.length > 3000) appData.tombstones.accounts.splice(0, appData.tombstones.accounts.length - 3000);
        return removed;
    }`);
  if (!c.includes(anchor)) { console.log('TOMBSTONE ANCHOR NOT FOUND'); process.exit(1); }
  const helpers = norm(`        if (appData.tombstones.accounts.length > 3000) appData.tombstones.accounts.splice(0, appData.tombstones.accounts.length - 3000);
        return removed;
    }

    // 按账目记录反查所属目标流水，撤销整笔操作：流水条目删除 + 该操作生成的所有账目（含对方账本那条）一并删除 + 目标进度同步
    function _revokeGoalOperation(g, log, triggerAccId) {
        if (!Array.isArray(appData.tombstones.accounts)) appData.tombstones.accounts = [];
        (log.accIds || []).forEach(function (id) {
            if (appData.tombstones.accounts.indexOf(id) < 0) appData.tombstones.accounts.push(id);
        });
        const key = '「' + g.name + '」';
        const isDep = log.amount > 0;
        appData.accounts = (appData.accounts || []).filter(function (a) {
            if (!a) return true;
            // 新流水：按 accIds 精确删；旧流水：按 金额+经手人+备注 匹配同操作的关联账
            const linked = (log.accIds || []).indexOf(a.id) >= 0;
            const legacy = !(log.accIds || []).length && Math.abs((a.amount || 0)) === Math.abs(log.amount) && a.payer === log.userId && (
                isDep
                    ? ((a.note || '').indexOf('存入目标' + key) >= 0 || (a.note || '').indexOf('目标' + key) >= 0 || (a.category === 'goalback' && (a.note || '').indexOf('撤回' + key) >= 0))
                    : (((a.note || '').indexOf('取出') >= 0 && (a.note || '').indexOf(key) >= 0) || (a.category === 'goalback' && (a.note || '').indexOf('撤回' + key) >= 0 && (a.note || '').indexOf('取出') >= 0))
            );
            if (!(linked || legacy)) return true;
            if (appData.tombstones.accounts.indexOf(a.id) < 0) appData.tombstones.accounts.push(a.id);
            return false;
        });
        if (triggerAccId && appData.tombstones.accounts.indexOf(triggerAccId) < 0) appData.tombstones.accounts.push(triggerAccId);
        appData.accounts = (appData.accounts || []).filter(a => !(a && a.id === triggerAccId));
        // 流水条目直接删除（不保留"已撤回"痕迹）
        g.logs = (g.logs || []).filter(l => l.id !== log.id);
        if (log.amount > 0) g.saved = Math.max(0, Math.round(((g.saved || 0) - log.amount) * 100) / 100);
        else g.saved = Math.round(((g.saved || 0) + Math.abs(log.amount)) * 100) / 100;
        if ((g.target || 0) > 0) g.done = g.saved >= g.target;
        g.updatedAt = Date.now();
        return true;
    }

    function _revokeGoalOperationByRecord(rec) {
        const nameMatch = (rec.note || '').match(/「([^」]+)」/);
        if (!nameMatch) return false;
        const g = (appData.savingGoals || []).find(x => x.name === nameMatch[1]);
        if (!g) return false;
        const amt = Math.abs(Number(rec.amount) || 0);
        const isWithdrawRec = (Number(rec.amount) < 0) || rec.category === 'goalback';
        let log = null;
        (g.logs || []).forEach(function (l) {
            if ((l.accIds || []).indexOf(rec.id) >= 0) log = l;
        });
        if (!log) {
            const cands = (g.logs || []).filter(function (l) {
                return !l.withdrawn && Math.abs(l.amount) === amt && ((isWithdrawRec && l.amount < 0) || (!isWithdrawRec && l.amount > 0)) && l.userId === rec.payer;
            }).sort(function (a, b) { return Math.abs((a.time || 0) - (rec.createTime || 0)) - Math.abs((b.time || 0) - (rec.createTime || 0)); });
            log = cands[0] || null;
        }
        if (!log) return false;
        return _revokeGoalOperation(g, log, rec.id);
    }`);
  c = c.replace(anchor, helpers);
  log.push('helpers inserted');
}

// —— 2. 撤回函数：流水条目直接删除 ——
const depOld = norm(`        log.withdrawn = true;
        log.accIds = [];
        g.saved = Math.max(0, Math.round(((g.saved || 0) - log.amount) * 100) / 100);
        if (g.saved < (g.target || 0)) g.done = false;`);
if (c.includes(depOld)) {
  c = c.replace(depOld, norm(`        // 流水条目直接删除（不显示"已撤回"）
        g.logs = (g.logs || []).filter(l => l.id !== log.id);
        g.saved = Math.max(0, Math.round(((g.saved || 0) - log.amount) * 100) / 100);
        if (g.saved < (g.target || 0)) g.done = false;`));
  log.push('undoDeposit log-removal');
}
const wOld = norm(`        log.withdrawn = true;
        log.accIds = [];
        g.saved = Math.round(((g.saved || 0) + amt) * 100) / 100;`);
if (c.includes(wOld)) {
  c = c.replace(wOld, norm(`        // 流水条目直接删除（不显示"已撤回"）
        g.logs = (g.logs || []).filter(l => l.id !== log.id);
        g.saved = Math.round(((g.saved || 0) + amt) * 100) / 100;`));
  log.push('undoWithdraw log-removal');
}

// —— 3. deleteAccountEntry：目标存取记录联动撤销 + 普通记录墓碑防复活 ——
const delOld = norm(`    function deleteAccountEntry(id) {
        const rec = (appData.accounts || []).find(x => x.id === id);
        // 对方账本只读：不能删TA记的账（共有账本的记录双方都能删）
        if (rec && rec.book !== 'shared' && rec.book !== appData.currentUserId) {
            showToast('👀 TA的账本只能查看，由TA自己管理');
            return;
        }
        if (!confirm('删除这笔记录吗？')) return;
        appData.accounts = (appData.accounts || []).filter(r => r.id !== id);
        saveData();
        renderAccountPage();
        showToast('已删除该笔记录');
    }`);
if (c.includes(delOld)) {
  const delNew = norm(`    function deleteAccountEntry(id) {
        const rec = (appData.accounts || []).find(x => x.id === id);
        if (!rec) return;
        // 对方账本只读：不能删TA记的账（共有账本的记录双方都能删）
        if (rec.book !== 'shared' && rec.book !== appData.currentUserId) {
            showToast('👀 TA的账本只能查看，由TA自己管理');
            return;
        }
        if (!Array.isArray(appData.tombstones.accounts)) appData.tombstones.accounts = [];
        // 攒钱目标相关的自动记账：删除时同步撤销对应操作（流水删除 + 关联账目一并删除 + 进度同步）
        if (rec.category === 'goal' || rec.category === 'goalback') {
            if (!confirm('删除这条记录会同时撤销对应的存入/取出操作，目标进度同步调整，确定吗？')) return;
            const revoked = _revokeGoalOperationByRecord(rec);
            if (!revoked) {
                // 所属目标已不存在：仅删除账目本身
                if (appData.tombstones.accounts.indexOf(rec.id) < 0) appData.tombstones.accounts.push(rec.id);
                appData.accounts = appData.accounts.filter(r => r.id !== id);
            }
        } else {
            if (!confirm('删除这笔记录吗？')) return;
            if (appData.tombstones.accounts.indexOf(rec.id) < 0) appData.tombstones.accounts.push(rec.id);
            appData.accounts = appData.accounts.filter(r => r.id !== id);
        }
        saveData();
        renderAccountPage();
        showToast('已删除该笔记录');
    }`);
  c = c.replace(delOld, delNew);
  log.push('deleteAccountEntry upgraded');
}

fs.writeFileSync(f, c, 'utf8');
console.log(log.join(' | ') || 'NOTHING CHANGED');
