// 农历转换算法验证：先单测，通过后再嵌入 index.html
const LUNAR_INFO = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,//1900-1909
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,//1910-1919
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,//1920-1929
    0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,//1930-1939
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,//1940-1949
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,//1950-1959
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,//1960-1969
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,//1970-1979
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,//1980-1989
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,//1990-1999
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,//2000-2009
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,//2010-2019
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,//2020-2029
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,//2030-2039
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,//2040-2049
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,//2050-2059
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,//2060-2069
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,//2070-2079
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,//2080-2089
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,//2090-2099
    0x0d520//2100
];
const LUNAR_BASE_MS = Date.UTC(1900, 0, 31); // 农历 1900-01-01 = 公历 1900-01-31

function _lYearDays(y) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
    return sum + _lLeapDays(y);
}
function _lLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
function _lLeapDays(y) { return _lLeapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function _lMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }

// 农历 → 公历
function lunarToSolarDate(ly, lm, ld, isLeap) {
    ly = parseInt(ly, 10); lm = parseInt(lm, 10); ld = parseInt(ld, 10);
    if (!(ly >= 1900 && ly <= 2100) || !(lm >= 1 && lm <= 12) || !(ld >= 1)) return null;
    const leap = _lLeapMonth(ly);
    if (isLeap && leap !== lm) return null;
    const md = isLeap ? _lLeapDays(ly) : _lMonthDays(ly, lm);
    if (!md || ld > md) return null;
    let days = 0;
    for (let i = 1900; i < ly; i++) days += _lYearDays(i);
    for (let i = 1; i < lm; i++) {
        days += _lMonthDays(ly, i);
        if (leap === i) days += _lLeapDays(ly);
    }
    if (isLeap) days += _lMonthDays(ly, lm);
    days += ld - 1;
    const dt = new Date(LUNAR_BASE_MS + days * 86400000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// 公历 → 农历
function solarToLunarDate(y, m, d) {
    let offset = Math.floor((Date.UTC(y, m - 1, d) - LUNAR_BASE_MS) / 86400000);
    if (!(offset >= 0)) return null;
    let ly = 1900;
    while (ly <= 2100) {
        const yd = _lYearDays(ly);
        if (offset < yd) break;
        offset -= yd; ly++;
    }
    if (ly > 2100) return null;
    const leap = _lLeapMonth(ly);
    let lm = 1, isLeap = false;
    while (lm <= 12) {
        let md = _lMonthDays(ly, lm);
        if (offset < md) break;
        offset -= md;
        if (leap === lm) {
            md = _lLeapDays(ly);
            if (offset < md) { isLeap = true; break; }
            offset -= md;
        }
        lm++;
    }
    if (lm > 12) return null;
    return { y: ly, m: lm, d: offset + 1, leap: isLeap };
}

// ---------- 验证 ----------
let fail = 0;
function eq(name, got, want) {
    const g = JSON.stringify(got), w = JSON.stringify(want);
    if (g !== w) { fail++; console.log('FAIL', name, 'got', g, 'want', w); }
}

// 锚点：春节（农历正月初一 → 公历）
const sprFest = { 1987: '1987-01-29', 2000: '2000-02-05', 2020: '2020-01-25', 2021: '2021-02-12', 2022: '2022-02-01', 2023: '2023-01-22', 2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13' };
Object.keys(sprFest).forEach(y => {
    const r = lunarToSolarDate(y, 1, 1, false);
    const want = sprFest[y]; // 'YYYY-MM-DD'
    const got = r ? `${r.y}-${String(r.m).padStart(2, '0')}-${String(r.d).padStart(2, '0')}` : null;
    eq('春节' + y, got, want);
});

// 锚点：闰月分布
eq('闰2025', _lLeapMonth(2025), 6);
eq('闰2020', _lLeapMonth(2020), 4);
eq('闰2023', _lLeapMonth(2023), 2);
eq('闰2028', _lLeapMonth(2028), 5);
eq('闰2033', _lLeapMonth(2033), 11);
eq('无闰2026', _lLeapMonth(2026), 0);

// 锚点：2026 八月十五 = 2026-09-25（中秋）
eq('中秋2026', lunarToSolarDate(2026, 8, 15, false), { y: 2026, m: 9, d: 25 });
// 2026 五月初五（端午）= 2026-06-19
eq('端午2026', lunarToSolarDate(2026, 5, 5, false), { y: 2026, m: 6, d: 19 });
// 2025 闰六月初一 = 2025-07-25
eq('闰六月2025', lunarToSolarDate(2025, 6, 1, true), { y: 2025, m: 7, d: 25 });

// 往返全覆盖：1901-02-01 起每 3 天一个公历日期 → 农历 → 公历
let n = 0;
for (let ms = Date.UTC(1901, 1, 1); ms <= Date.UTC(2099, 11, 31); ms += 3 * 86400000) {
    const dt = new Date(ms);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const l = solarToLunarDate(y, m, d);
    if (!l) { fail++; console.log('FAIL solar2lunar null', y, m, d); continue; }
    const back = lunarToSolarDate(l.y, l.m, l.d, l.leap);
    if (!back || back.y !== y || back.m !== m || back.d !== d) {
        fail++;
        if (fail < 10) console.log('FAIL roundtrip', y, m, d, '→', JSON.stringify(l), '→', JSON.stringify(back));
    }
    n++;
}
console.log('roundtrip tested', n, 'dates');

// 农历→公历→农历 往返（抽样含闰月）
[2020, 2023, 2025, 2028, 2033].forEach(y => {
    const leap = _lLeapMonth(y);
    for (let m = 1; m <= 12; m++) {
        for (const d of [1, 15, 29, 30]) {
            for (const isLeap of [false, true]) {
                if (isLeap && leap !== m) continue;
                const s = lunarToSolarDate(y, m, d, isLeap);
                if (!s) { if (d === 30) continue; fail++; console.log('FAIL l2s null', y, m, d, isLeap); continue; }
                const l = solarToLunarDate(s.y, s.m, s.d);
                if (!l || l.y !== y || l.m !== m || l.d !== d || !!l.leap !== !!isLeap) {
                    fail++; console.log('FAIL l2s roundtrip', y, m, d, isLeap, '→', JSON.stringify(s), '→', JSON.stringify(l));
                }
            }
        }
    }
});

const today = solarToLunarDate(2026, 10, 7);
console.log('today 2026-10-07 lunar:', JSON.stringify(today), '=>', (today.leap ? '闰' : '') + today.m + '月' + today.d);
console.log(fail === 0 ? '✅ 全部通过' : '❌ ' + fail + ' 个失败');
process.exit(fail === 0 ? 0 : 1);
