const fs = require('fs');
const f = 'C:/Users/admin/Desktop/VS/HTML/栗子空间/kongjian.html';
let c = fs.readFileSync(f, 'utf8');
const NL = c.includes('\r\n') ? '\r\n' : '\n';
const norm = s => s.replace(/\n/g, NL);
const old = norm(`        saveData();
        renderSavingGoals();
        showToast(g && !g.done && (g.saved || 0) > 0 ? '目标已删除，存入的钱已原路退回' : '已删除目标');
    }`);
if (!c.includes(old)) { console.log('ANCHOR NOT FOUND'); process.exit(1); }
const rep = norm(`        saveData();
        renderAccountPage(); // 目标卡片 + 账目明细 + 月度汇总一起刷新，删除立即生效
        showToast(g && !g.done && (g.saved || 0) > 0 ? '目标已删除，存入的钱已原路退回' : '已删除目标');
    }`);
c = c.replace(old, rep);
fs.writeFileSync(f, c, 'utf8');
console.log('fixed: deleteSavingGoal now re-renders the whole account page');
