// 栗子空间 - 离线工具箱（大学生版）纯函数冒烟测试
// 从 index.html 提取工具箱脚本块，在无 DOM 环境下只测纯计算函数。
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const startMark = '    // ==================== 离线工具箱（🧰 工具库） ====================';
const endMark = '    // ==================== 离线工具箱结束 ====================';
const s = html.indexOf(startMark), e = html.indexOf(endMark);
if (s < 0 || e < 0 || e <= s) { console.error('❌ 未找到工具箱代码块'); process.exit(1); }
const code = html.slice(s, e);

const factory = new Function('relationship', 'showToast', 'document', code + '\n;return { _rmbUpper: _rmbUpper, _aaPer: _aaPer, _bmiOf: _bmiOf, GPA_SCALES: GPA_SCALES, _gpaPointOf: _gpaPointOf, _gpaPointPku: _gpaPointPku, _gpaScoreNorm: _gpaScoreNorm, _gpaCompute: _gpaCompute, GPA_LEVEL: GPA_LEVEL, _wcStats: _wcStats };');
const api = factory(function () { return []; }, function () {}, undefined);

let failed = 0;
function T(name, cond, extra) {
    if (cond) { console.log('[OK]   ' + name); }
    else { failed++; console.error('[FAIL] ' + name + (extra !== undefined ? ' —— ' + JSON.stringify(extra) : '')); }
}
function scale(id) { return api.GPA_SCALES.filter(function (x) { return x.id === id; })[0]; }

// —— 原有工具回归 ——
T('_rmbUpper 1208.5 = 壹仟贰佰零捌元伍角整', api._rmbUpper(1208.5) === '壹仟贰佰零捌元伍角整', api._rmbUpper(1208.5));
T('_aaPer 288/3 = 96', api._aaPer(288, 3) === 96);
T('_bmiOf 165/52 ≈ 19.1', Math.abs(api._bmiOf(165, 52) - 19.096) < 0.01);

// —— 已删工具确认 ——
T('期末目标分已删除', code.indexOf('_finalNeed') < 0 && code.indexOf('toolFinalPage') < 0);
T('生活费/倒计时无残留', code.indexOf('_budgetPer') < 0 && code.indexOf('calcCountdown') < 0);

// —— 绩点：口径清单 ——
T('共 9 种口径（8 种算法 + 加权均分）', api.GPA_SCALES.length === 9, api.GPA_SCALES.map(function (x) { return x.id; }));
['ten37', 'ten367', 'std40', 'imp40', 'pku', 'ustc', 'can43', 'five5', 'avg'].forEach(function (id) {
    T('口径存在：' + id, !!scale(id));
});

// —— 绩点：成绩归一（分数 / 等级） ——
T('分数 92 → 92', api._gpaScoreNorm('92') === 92);
T('小数 92.5 → 92.5', api._gpaScoreNorm('92.5') === 92.5);
T('优 → 95', api._gpaScoreNorm('优') === 95);
T('不及格 → 50', api._gpaScoreNorm('不及格') === 50);
T('105 / -5 / abc → null', api._gpaScoreNorm('105') === null && api._gpaScoreNorm('-5') === null && api._gpaScoreNorm('abc') === null);

// —— 各算法单科换算 ——
T('十段3.7：92→4.0 · 84→3.3 · 60→1.0 · 59→0', api._gpaPointOf(92, scale('ten37').table) === 4 && api._gpaPointOf(84, scale('ten37').table) === 3.3 && api._gpaPointOf(60, scale('ten37').table) === 1 && api._gpaPointOf(59, scale('ten37').table) === 0);
T('十段3.67：85→3.67 · 84→3.33 · 64→1.67', api._gpaPointOf(85, scale('ten367').table) === 3.67 && api._gpaPointOf(84, scale('ten367').table) === 3.33 && api._gpaPointOf(64, scale('ten367').table) === 1.67);
T('五段4.0：89→3.0 · 80→3.0 · 79→2.0 · 60→1.0', api._gpaPointOf(89, scale('std40').table) === 3 && api._gpaPointOf(80, scale('std40').table) === 3 && api._gpaPointOf(79, scale('std40').table) === 2 && api._gpaPointOf(60, scale('std40').table) === 1);
T('改进4.0：85→4.0 · 84→3.0 · 60→2.0 · 59→0', api._gpaPointOf(85, scale('imp40').table) === 4 && api._gpaPointOf(84, scale('imp40').table) === 3 && api._gpaPointOf(60, scale('imp40').table) === 2 && api._gpaPointOf(59, scale('imp40').table) === 0);
T('中科大4.3：95→4.3 · 90→4.0 · 89→3.7 · 60→1.3', api._gpaPointOf(95, scale('ustc').table) === 4.3 && api._gpaPointOf(90, scale('ustc').table) === 4 && api._gpaPointOf(89, scale('ustc').table) === 3.7 && api._gpaPointOf(60, scale('ustc').table) === 1.3);
T('加拿大4.3：90→4.3 · 85→4.0 · 60→2.3 · 59→0', api._gpaPointOf(90, scale('can43').table) === 4.3 && api._gpaPointOf(85, scale('can43').table) === 4 && api._gpaPointOf(60, scale('can43').table) === 2.3 && api._gpaPointOf(59, scale('can43').table) === 0);
T('五分制：90→5 · 80→4 · 60→2 · 50→0', api._gpaPointOf(90, scale('five5').table) === 5 && api._gpaPointOf(80, scale('five5').table) === 4 && api._gpaPointOf(60, scale('five5').table) === 2 && api._gpaPointOf(50, scale('five5').table) === 0);

// —— 北大连续公式：只有 100 满绩 ——
T('北大：100→4.0（唯一满绩）', Math.abs(api._gpaPointPku(100) - 4) < 1e-9);
T('北大：90→3.8125', Math.abs(api._gpaPointPku(90) - 3.8125) < 1e-9, api._gpaPointPku(90));
T('北大：60→1.0 · 59以下→0', Math.abs(api._gpaPointPku(60) - 1) < 1e-9 && api._gpaPointPku(59) === 0 && api._gpaPointPku(0) === 0);
T('北大：99 < 100（连续扣分）', api._gpaPointPku(99) < 4 && api._gpaPointPku(99) > 3.99, api._gpaPointPku(99));

// —— 加权计算（高数5学分92 / 英语3学分85 / 体育1学分95）——
const items = [{ credit: 5, score: 92 }, { credit: 3, score: 85 }, { credit: 1, score: 95 }];
const c = api._gpaCompute(items);
T('返回 9 个口径的值', c && Object.keys(c.vals).length === 9);
T('加权均分 = 90', Math.abs(c.avg - 90) < 1e-9, c.avg);
T('十段3.7 = 3.90', Math.abs(c.vals.ten37 - 3.9) < 1e-9, c.vals.ten37);
T('十段3.67 = 3.89', Math.abs(c.vals.ten367 - 35.01 / 9) < 1e-9, c.vals.ten367);
T('五段4.0 ≈ 3.67（85属80档→3.0）', Math.abs(c.vals.std40 - 33 / 9) < 1e-9, c.vals.std40);
T('改进4.0 = 4.00（全部≥85）', Math.abs(c.vals.imp40 - 4) < 1e-9);
T('北大4.0 ≈ 3.7875（压绩点）', Math.abs(c.vals.pku - 34.0875 / 9) < 1e-9, c.vals.pku);
T('中科大4.3 ≈ 3.9333', Math.abs(c.vals.ustc - 35.4 / 9) < 1e-9, c.vals.ustc);
T('加拿大4.3 = 4.20', Math.abs(c.vals.can43 - 4.2) < 1e-9, c.vals.can43);
T('五分制 ≈ 4.6667', Math.abs(c.vals.five5 - 42 / 9) < 1e-9, c.vals.five5);
T('总学分 9 · 门数 3 · 无挂科', c.credits === 9 && c.count === 3 && c.fails === 0);

// 加权 vs 算术平均必须不同（证明是加权不是简单平均）
const cw = api._gpaCompute([{ credit: 10, score: 60 }, { credit: 1, score: 100 }]);
T('加权口径：10学分60分+1学分100分 ≈ 63.6 ≠ 80', Math.abs(cw.avg - 700 / 11) < 1e-9 && Math.abs(cw.avg - 80) > 1e-9, cw.avg);

// 等级折算参与计算：优(95) 2学分 → 十段3.7 = 4.0
const cl = api._gpaCompute([{ credit: 2, score: api.GPA_LEVEL['优'] }]);
T('等级优→95→十段3.7为4.0', Math.abs(cl.vals.ten37 - 4) < 1e-9, cl.vals.ten37);

T('空输入返回 null', api._gpaCompute([]) === null);

// —— 字数统计 ——
const st = api._wcStats('你好，世界。hello!');
T('汉字 4 · 单词 1 · 标点 3', st.han === 4 && st.en === 1 && st.punct === 3, st);
T('字数(Word口径) = 5', st.words === 5, st.words);
const st2 = api._wcStats('你好世界 hello 123 个测试 word。');
T('汉字7 词2 数字1 标点1 · 总字符 24/20', st2.han === 7 && st2.en === 2 && st2.num === 1 && st2.punct === 1 && st2.withWs === 24 && st2.noWs === 20, st2);
T('空串归零', api._wcStats('').words === 0 && api._wcStats('').punct === 0);

console.log(failed === 0 ? '\n全部通过 ✓' : '\n存在失败项：' + failed);
process.exit(failed === 0 ? 0 : 1);
