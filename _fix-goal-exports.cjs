const fs = require('fs');
const f = 'C:/Users/admin/Desktop/VS/HTML/栗子空间/kongjian.html';
let c = fs.readFileSync(f, 'utf8');
const before = "'depositToGoal', 'withdrawFromGoal', 'undoGoalDeposit',";
const after = "'depositToGoal', 'withdrawFromGoal', 'undoGoalDeposit', 'undoGoalWithdraw',";
if (!c.includes(before)) { console.log('PATTERN NOT FOUND'); process.exit(1); }
c = c.replace(before, after);
fs.writeFileSync(f, c, 'utf8');
console.log('undoGoalWithdraw exported');
