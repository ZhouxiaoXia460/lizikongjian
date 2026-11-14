    // ============ ⑥ 绩点计算器 ============
    // GPA = Σ(单科绩点 × 该科学分) ÷ 总学分（学分加权）
    // 四分制按主流十段；五分制按五段；等级按 优95/良85/中75/及格65/不及格50 折算
    const GPA_4 = [[90, 4], [85, 3.7], [82, 3.3], [78, 3], [75, 2.7], [72, 2.3], [68, 2], [64, 1.5], [60, 1], [0, 0]];
    const GPA_5 = [[90, 5], [80, 4], [70, 3], [60, 2], [0, 0]];
    const GPA_LEVEL = { '优': 95, '良': 85, '中': 75, '及格': 65, '不及格': 50 };
    function _gpaPointOf(score, scale) {
        for (let i = 0; i < scale.length; i++) if (score >= scale[i][0]) return scale[i][1];
        return 0;
    }
    function _gpaScoreNorm(raw) {
        const t = String(raw || '').trim();
        if (!t) return null;
        if (GPA_LEVEL[t] !== undefined) return GPA_LEVEL[t];
        const v = parseFloat(t);
        if (!(v >= 0 && v <= 100)) return null;
        return v;
    }
    function _gpaCollect() {
        const rows = document.querySelectorAll('#gpaRows .gpa-row');
        const items = [], bad = [];
        let levelUsed = false;
        Array.prototype.forEach.call(rows, function (row, i) {
            const creditRaw = (row.querySelector('.gpa-credit').value || '').trim();
            const scoreRaw = (row.querySelector('.gpa-score').value || '').trim();
            if (!creditRaw && !scoreRaw) return; // 整行没填，不算错
            const credit = parseFloat(creditRaw);
            const score = _gpaScoreNorm(scoreRaw);
            if (!(credit > 0) || credit > 20 || score === null) { bad.push(i + 1); return; }
            if (GPA_LEVEL[scoreRaw] !== undefined) levelUsed = true;
            items.push({ credit: credit, score: score });
        });
        return { items: items, bad: bad, levelUsed: levelUsed };
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
    function openToolGpa() {
        showPage('toolGpaPage');
        const rows = document.getElementById('gpaRows');
        if (rows && !rows.children.length) for (let i = 0; i < 4; i++) gpaAddRow();
        calcGpa();
    }
    function gpaAddRow(name, credit, score) {
        const wrap = document.getElementById('gpaRows');
        if (!wrap) return;
        if (wrap.children.length >= 60) { showToast('最多 60 门课，够用啦'); return; }
        const row = document.createElement('div');
        row.className = 'gpa-row flex gap-2 items-center mb-2';
        row.innerHTML =
            '<input type="text" class="gpa-name flex-1 min-w-0 px-3 py-2 rounded-xl border border-[#F5DEC2] text-sm bg-[#FFFBF5] focus:outline-none focus:border-[#D9A56E] transition-all" placeholder="科目，如 高数">' +
            '<input type="number" class="gpa-credit w-16 flex-shrink-0 px-2 py-2 rounded-xl border border-[#F5DEC2] text-sm bg-[#FFFBF5] text-center focus:outline-none focus:border-[#D9A56E] transition-all" placeholder="如 4" inputmode="decimal">' +
            '<input type="text" class="gpa-score w-16 flex-shrink-0 px-2 py-2 rounded-xl border border-[#F5DEC2] text-sm bg-[#FFFBF5] text-center focus:outline-none focus:border-[#D9A56E] transition-all" placeholder="92/优">' +
            '<button onclick="gpaRemoveRow(this)" class="w-7 h-7 rounded-lg bg-white border border-[#F5DEC2] text-[#B08968] text-sm leading-none flex-shrink-0 active:scale-90 transition-all" title="删除这一行">×</button>';
        if (name) row.querySelector('.gpa-name').value = name;
        if (credit !== undefined && credit !== null && credit !== '') row.querySelector('.gpa-credit').value = credit;
        if (score !== undefined && score !== null && score !== '') row.querySelector('.gpa-score').value = score;
        Array.prototype.forEach.call(row.querySelectorAll('input'), function (el) { el.addEventListener('input', calcGpa); });
        wrap.appendChild(row);
        calcGpa();
    }
    function gpaRemoveRow(btn) {
        const row = btn.parentNode;
        if (row && row.parentNode) row.parentNode.removeChild(row);
        calcGpa();
    }
    function calcGpa() {
        const emptyEl = document.getElementById('gpaEmpty'), boxEl = document.getElementById('gpaBox');
        if (!boxEl) return;
        const r = _gpaCollect();
        const c = _gpaCompute(r.items);
        if (!c) { emptyEl.classList.remove('hidden'); boxEl.classList.add('hidden'); return; }
        emptyEl.classList.add('hidden'); boxEl.classList.remove('hidden');
        document.getElementById('gpaMain4').textContent = c.gpa4.toFixed(2);
        document.getElementById('gpaMain5').textContent = c.gpa5.toFixed(2);
        document.getElementById('gpaSub').textContent = '加权平均分 ' + c.avg.toFixed(1) + ' · 共 ' + c.count + ' 门课 ' + c.credits + ' 学分';
        let note = '';
        if (r.bad.length) note += '第 ' + r.bad.join('、') + ' 行没填完整，先不算它；';
        if (r.levelUsed) note += '等级按 优95 / 良85 / 中75 / 及格65 / 不及格50 折算；';
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
