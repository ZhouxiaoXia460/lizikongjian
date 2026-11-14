const fs = require('fs');
const f = 'C:/Users/admin/Desktop/VS/HTML/栗子空间/kongjian.html';
let c = fs.readFileSync(f, 'utf8');
const NL = c.includes('\r\n') ? '\r\n' : '\n';
const norm = s => s.replace(/\n/g, NL);
let done = [];

// —— 1. 重写 deleteSavingGoal：未完成目标删除 = 原路退回（全部相关记账删除）+ 目标墓碑 ——
const delOld = norm(`    function deleteSavingGoal(id) {
        const g = (appData.savingGoals || []).find(x => x.id === id);
        // 对方的个人目标只读：谁的目标谁管（共同目标双方都能删）
        if (g && (g.owner || 'shared') !== 'shared' && g.owner !== appData.currentUserId) {
            showToast('👀 TA的目标只能围观，由TA自己管理');
            return;
        }
        if (!confirm('确定删除这个攒钱目标吗？')) return;
        appData.savingGoals = (appData.savingGoals || []).filter(x => x.id !== id);
        saveData();
        renderSavingGoals();
        showToast('已删除目标');
    }`);
if (c.includes(delOld)) {
  const delNew = norm(`    function deleteSavingGoal(id) {
        const g = (appData.savingGoals || []).find(x => x.id === id);
        // 对方的个人目标只读：谁的目标谁管（共同目标双方都能删）
        if (g && (g.owner || 'shared') !== 'shared' && g.owner !== appData.currentUserId) {
            showToast('👀 TA的目标只能围观，由TA自己管理');
            return;
        }
        // 未完成目标删除 = 原路退回：该目标所有自动记账删除（存入的支出消失，钱即退回），目标进墓碑防复活
        if (g && !g.done) {
            const savedAmt = g.saved || 0;
            const tip = savedAmt > 0 ? ('已存入的 ' + formatMoney(savedAmt) + ' 会原路退回（相关记账一并删除）') : '相关记账会一并删除';
            if (!confirm('确定删除未完成的目标「' + g.name + '」吗？' + tip + '，无法恢复。')) return;
            _dissolveGoalRecords(g);
        } else if (g) {
            if (!confirm('「' + g.name + '」已达成，删除后相关记账会保留作为历史，确定吗？')) return;
        }
        appData.savingGoals = (appData.savingGoals || []).filter(x => x.id !== id);
        if (!Array.isArray(appData.tombstones.goals)) appData.tombstones.goals = [];
        if (appData.tombstones.goals.indexOf(id) < 0) appData.tombstones.goals.push(id);
        saveData();
        renderSavingGoals();
        showToast(g && !g.done && (g.saved || 0) > 0 ? '目标已删除，存入的钱已原路退回' : '已删除目标');
    }

    // 删除未完成目标时：清空该目标产生的全部自动记账（存入/取出/冲回），钱视为原路退回
    function _dissolveGoalRecords(g) {
        if (!Array.isArray(appData.tombstones.accounts)) appData.tombstones.accounts = [];
        const key = '「' + g.name + '」';
        const linked = [];
        (g.logs || []).forEach(function (l) { (l.accIds || []).forEach(function (id) { if (linked.indexOf(id) < 0) linked.push(id); }); });
        appData.accounts = (appData.accounts || []).filter(function (a) {
            if (!a) return true;
            const hit = linked.indexOf(a.id) >= 0 || ((a.category === 'goal' || a.category === 'goalback') && (a.note || '').indexOf(key) >= 0);
            if (!hit) return true;
            if (appData.tombstones.accounts.indexOf(a.id) < 0) appData.tombstones.accounts.push(a.id);
            return false;
        });
    }`);
  c = c.replace(delOld, delNew);
  done.push('deleteSavingGoal rewritten');
} else if (c.includes('_dissolveGoalRecords')) { done.push('already rewritten'); } else { console.log('DEL ANCHOR NOT FOUND'); process.exit(1); }

// —— 2. 目标墓碑基础设施 ——
if (!c.includes('tombstones: { messages: [], journals: [], memoLists: [], memoItems: [], accounts: [], goals: [] }')) {
  const tOld = 'tombstones: { messages: [], journals: [], memoLists: [], memoItems: [], accounts: [] },';
  if (!c.includes(tOld)) { console.log('DEFAULT TOMBSTONE ANCHOR NOT FOUND'); process.exit(1); }
  c = c.replace(tOld, 'tombstones: { messages: [], journals: [], memoLists: [], memoItems: [], accounts: [], goals: [] },');
  done.push('default tombstones.goals');
}
if (!c.includes("if (!Array.isArray(appData.tombstones.goals)) appData.tombstones.goals = [];")) {
  const lOld = norm(`            if (!Array.isArray(appData.tombstones.accounts)) appData.tombstones.accounts = [];`);
  if (!c.includes(lOld)) { console.log('LOAD ANCHOR NOT FOUND'); process.exit(1); }
  c = c.replace(lOld, lOld + norm(`
            if (!Array.isArray(appData.tombstones.goals)) appData.tombstones.goals = [];`));
  done.push('load tombstones.goals');
}
// 合并：墓碑并集
if (!c.includes("['messages', 'journals', 'memoLists', 'memoItems', 'accounts', 'goals'].forEach")) {
  const uOld = "['messages', 'journals', 'memoLists', 'memoItems', 'accounts'].forEach";
  if (!c.includes(uOld)) { console.log('UNION ANCHOR NOT FOUND'); process.exit(1); }
  c = c.replace(uOld, "['messages', 'journals', 'memoLists', 'memoItems', 'accounts', 'goals'].forEach");
  done.push('tombstone union + goals');
}

// —— 3. savingGoals 合并：跳过墓碑目标 + 墓碑落地删除 ——
const sgOld = norm(`        if (Array.isArray(remoteData.savingGoals)) {
            if (!Array.isArray(appData.savingGoals)) appData.savingGoals = [];
            remoteData.savingGoals.forEach(rg => {
                if (!rg || !rg.id) return;`);
if (c.includes(sgOld)) {
  const sgNew = norm(`        if (Array.isArray(remoteData.savingGoals)) {
            if (!Array.isArray(appData.savingGoals)) appData.savingGoals = [];
            if (!Array.isArray(appData.tombstones.goals)) appData.tombstones.goals = [];
            const goalGone = function (id) { return appData.tombstones.goals.indexOf(id) >= 0; };
            // 目标墓碑落地：对方删除的目标，本机也一并删除
            const beforeGoals = appData.savingGoals.length;
            appData.savingGoals = appData.savingGoals.filter(g => !(g && goalGone(g.id)));
            if (appData.savingGoals.length !== beforeGoals) changed = true;
            remoteData.savingGoals.forEach(rg => {
                if (!rg || !rg.id || goalGone(rg.id)) return;`);
  c = c.replace(sgOld, sgNew);
  done.push('savingGoals merge tombstones');
} else if (c.includes('goalGone(rg.id)')) { done.push('merge already done'); } else { console.log('SG MERGE ANCHOR NOT FOUND'); process.exit(1); }

fs.writeFileSync(f, c, 'utf8');
console.log('done:', done.join(' | '));
