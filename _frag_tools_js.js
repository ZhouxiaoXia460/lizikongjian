    // ============ ⑥ 绩点计算器 ============
    // 四分制按主流十段换算，五分制按五段换算，两种同时给出
    const GPA_4 = [[90, 4], [85, 3.7], [82, 3.3], [78, 3], [75, 2.7], [72, 2.3], [68, 2], [64, 1.5], [60, 1], [0, 0]];
    const GPA_5 = [[90, 5], [80, 4], [70, 3], [60, 2], [0, 0]];
    function _gpaParse(text) {
        const lines = String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        const items = [], bad = [];
        lines.forEach(function (line, i) {
            const nums = line.match(/\d+(?:\.\d+)?/g) || [];
            if (nums.length < 2) { bad.push(i + 1); return; }
            const credit = parseFloat(nums[nums.length - 2]);
            const score = parseFloat(nums[nums.length - 1]);
            if (!(credit > 0) || credit > 20 || !(score >= 0 && score <= 100)) { bad.push(i + 1); return; }
            items.push({ credit: credit, score: score });
        });
        return { items: items, bad: bad };
    }
    function _gpaPointOf(score, scale) {
        for (let i = 0; i < scale.length; i++) if (score >= scale[i][0]) return scale[i][1];
        return 0;
    }
    function _gpaCompute(items) {
        let credits = 0, wsum = 0, g4 = 0, g5 = 0, fails = 0;
        items.forEach(function (it) {
            credits += it.credit;
            wsum += it.score * it.credit;
            g4 += _gpaPointOf(it.score, GPA_4) * it.credit;
            g5 += _gpaPointOf(it.score, GPA_5) * it.credit;
            if (it.score < 60) fails++;
        });
        if (credits <= 0) return null;
        return { avg: wsum / credits, gpa4: g4 / credits, gpa5: g5 / credits, credits: credits, fails: fails, count: items.length };
    }
    function openToolGpa() { showPage('toolGpaPage'); calcGpa(); }
    function calcGpa() {
        const emptyEl = document.getElementById('gpaEmpty'), boxEl = document.getElementById('gpaBox');
        if (!boxEl) return;
        const r = _gpaParse(document.getElementById('gpaIn').value);
        const c = _gpaCompute(r.items);
        if (!c) { emptyEl.classList.remove('hidden'); boxEl.classList.add('hidden'); return; }
        emptyEl.classList.add('hidden'); boxEl.classList.remove('hidden');
        document.getElementById('gpaMain4').textContent = c.gpa4.toFixed(2);
        document.getElementById('gpaMain5').textContent = c.gpa5.toFixed(2);
        document.getElementById('gpaSub').textContent = '加权平均分 ' + c.avg.toFixed(1) + ' · 共 ' + c.count + ' 门课 ' + c.credits + ' 学分';
        let note = '';
        if (r.bad.length) note += '第 ' + r.bad.join('、') + ' 行没看懂，已跳过；';
        note += c.fails ? ('有 ' + c.fails + ' 门不及格，补考加油 💪') : '全部通过，真棒 👍';
        document.getElementById('gpaNote').textContent = note;
        document.getElementById('gpaCopyBtn').classList.remove('hidden');
    }
    function gpaCopy() {
        const g4 = (document.getElementById('gpaMain4').textContent || '').trim();
        if (!g4) { showToast('先填课程学分和成绩'); return; }
        const g5 = (document.getElementById('gpaMain5').textContent || '').trim();
        _toolCopyText('GPA 四分制 ' + g4 + ' / 五分制 ' + g5 + ' · ' + (document.getElementById('gpaSub').textContent || '').trim());
    }

    // ============ ⑦ 期末目标分 ============
    function _finalNeed(p, w, t) {
        if (!(p >= 0) || !(w > 0 && w <= 100) || !(t >= 0)) return null;
        return (t - p * (1 - w / 100)) / (w / 100);
    }
    function _finalEst(p, w, f) {
        if (!(p >= 0) || !(w > 0 && w <= 100) || !(f >= 0)) return null;
        return p * (1 - w / 100) + f * (w / 100);
    }
    function openToolFinal() { showPage('toolFinalPage'); calcFinal(); }
    function calcFinal() {
        const emptyEl = document.getElementById('finEmpty'), boxEl = document.getElementById('finBox');
        if (!boxEl) return;
        const p = parseFloat(document.getElementById('finP').value);
        const w = parseFloat(document.getElementById('finW').value);
        const t = parseFloat(document.getElementById('finT').value);
        const f = parseFloat(document.getElementById('finF').value);
        const need = _finalNeed(p, w, t);
        if (need === null || !isFinite(need)) { emptyEl.classList.remove('hidden'); boxEl.classList.add('hidden'); return; }
        emptyEl.classList.add('hidden'); boxEl.classList.remove('hidden');
        const main = document.getElementById('finMain'), note = document.getElementById('finNote');
        const wTxt = (w % 1 === 0) ? String(w) : w.toFixed(1);
        if (need <= 0) {
            main.textContent = '稳了 🎉';
            main.className = 'text-3xl font-bold text-[#4E7A4E] tracking-tight';
            note.textContent = '按平时占 ' + wTxt + '%，期末随便考都到 ' + t + ' 分';
        } else if (need > 100) {
            main.textContent = '够不着啦 😭';
            main.className = 'text-2xl font-bold text-[#EF5533] tracking-tight';
            note.textContent = '期末得考 ' + need.toFixed(1) + ' 分才能到 ' + t + ' 分，调调目标或找老师聊聊';
        } else {
            main.textContent = '至少考 ' + Math.ceil(need) + ' 分';
            main.className = 'text-3xl font-bold text-[#A66D3A] tracking-tight';
            note.textContent = '总评 = 平时 ' + p + ' × ' + (100 - wTxt) + '% ＋ 期末 × ' + wTxt + '%';
        }
        const est = _finalEst(p, w, f);
        document.getElementById('finEst').textContent = (est !== null)
            ? '若期末考 ' + f + ' 分 → 总评约 ' + est.toFixed(1) + ' 分'
            : '填上「期末预计分」可以反推总评';
        document.getElementById('finCopyBtn').classList.remove('hidden');
    }
    function finCopy() {
        const main = (document.getElementById('finMain').textContent || '').trim();
        if (!main) { showToast('先填平时成绩、占比和目标'); return; }
        const p = document.getElementById('finP').value, w = document.getElementById('finW').value, t = document.getElementById('finT').value;
        _toolCopyText('期末目标：' + main + '（平时 ' + p + ' 分 · 占比 ' + w + '% · 目标总评 ' + t + ' 分）');
    }

    // ============ ⑧ 字数统计 ============
    function _wcStats(s) {
        s = String(s || '');
        const han = (s.match(/[\u4e00-\u9fff]/g) || []).length;
        const en = (s.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
        const num = (s.match(/\d+(?:\.\d+)?/g) || []).length;
        return { han: han, en: en, num: num, words: han + en + num, withWs: s.length, noWs: s.replace(/\s/g, '').length };
    }
    function openToolWc() { showPage('toolWcPage'); calcWc(); }
    function calcWc() {
        const emptyEl = document.getElementById('wcEmpty'), boxEl = document.getElementById('wcBox');
        if (!boxEl) return;
        const s = document.getElementById('wcIn').value;
        if (!s.trim()) { emptyEl.classList.remove('hidden'); boxEl.classList.add('hidden'); return; }
        const st = _wcStats(s);
        emptyEl.classList.add('hidden'); boxEl.classList.remove('hidden');
        document.getElementById('wcMain').textContent = st.words.toLocaleString('zh-CN') + ' 字';
        document.getElementById('wcRows').textContent = '汉字 ' + st.han.toLocaleString('zh-CN') + ' · 英文单词 ' + st.en.toLocaleString('zh-CN') + ' · 数字 ' + st.num.toLocaleString('zh-CN');
        document.getElementById('wcChars').textContent = '总字符 ' + st.withWs.toLocaleString('zh-CN') + '（计空格）/ ' + st.noWs.toLocaleString('zh-CN') + '（不计空格）';
        document.getElementById('wcCopyBtn').classList.remove('hidden');
    }
    function wcCopy() {
        const m = (document.getElementById('wcMain').textContent || '').trim();
        if (!m) { showToast('先粘贴文字'); return; }
        _toolCopyText('字数统计：' + m + ' · ' + (document.getElementById('wcRows').textContent || '').trim());
    }
