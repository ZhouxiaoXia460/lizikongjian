/* 栗子空间 · 首次进入公告弹窗（自包含，不依赖应用内其他模块）
 * 数据源：TCB 云存储 chat 桶 lizi-space/notice.json（HTTP 网关直连，与主应用同一通道）
 * 策略：每次进入静默拉取一次；公告 version 大于本地已看版本且启用时，弹一次并立刻记住；
 *       同一版本对同一设备绝不重复弹；拉取失败/离线时保持安静。
 */
(function () {
    'use strict';
    var ENV = 'kongjian-d9gplvfce4e66ddb4';
    var GW = 'https://' + ENV + '.api.tcloudbasegateway.com';
    var BUCKET = 'chat';
    var NOTICE_PATH = 'lizi-space/notice.json';
    // 与 index.html 中 TCB_CONFIG.publishKey 相同的公开密钥（匿名权限）
    var PUBLISH_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjJlN2NkNDA4LWI2OWQtNGQ5My05MDI2LWUyZmMxZWMwNjE5NyJ9.eyJpc3MiOiJodHRwczovL2tvbmdqaWFuLWQ5Z3BsdmZjZTRlNjZkZGI0LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsImV4cCI6NDA5NDcwMTU4MywiaWF0IjoxNzkxMDE4MzgzLCJub25jZSI6IndweThLTkd0UmdxVy1sR0stSUhKS3ciLCJhdF9oYXNoIjoid3B5OEtOR3RSZ3FXLWxHSy1JSEpLdyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.P4FAu82jtD9nmBNAnsFAmIvOIgOHg6eG4o4-cOSc6T3rFcfPVINKk2vlWETgWsTx3T8pDdD_j7J-wrhxgPq4QS4dsNTHAEFlhN3F1-7UHGRxBWEYQBQM62bTS_gSK5IsNh5DjhAWpxMgcPj_Y0MZw84TO7N49_Kz9F2fqwGhPAsf4FmoqKTNkOvvET1eZA-Wy4LHsqTSALfsu3T-mRzCfACuBDW9FHRx9ZiRNnIi9zsiBDZ6yfObRmErin5F7T6LHIHoNfb4IPFrpOXPzV5jQbHP7sRDVYF6Cl6VI5ExODk5ypkUJ4Zht10zeOO2lz8jhwMDLd0GVX2eFJAJF3v2dg';
    var LS_KEY = 'lizi_notice_seen_v1';

    function getSeenVersion() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            var v = raw ? JSON.parse(raw) : null;
            return (v && typeof v.v === 'number') ? v.v : 0;
        } catch (e) { return 0; }
    }
    function markSeen(v) {
        try { localStorage.setItem(LS_KEY, JSON.stringify({ v: v, at: Date.now() })); } catch (e) { }
    }

    function fetchNotice() {
        return new Promise(function (resolve) {
            var finished = false;
            function finish(v) { if (!finished) { finished = true; resolve(v); } }
            var timer = setTimeout(function () { finish(null); }, 6000);
            var url = GW + '/v1/storages/object/' + BUCKET + '/' + NOTICE_PATH;
            try {
                fetch(url, {
                    method: 'GET',
                    headers: { 'Authorization': 'Bearer ' + PUBLISH_KEY },
                    cache: 'no-store'
                }).then(function (resp) {
                    if (!resp.ok) { clearTimeout(timer); return finish(null); }
                    return resp.text().then(function (txt) {
                        clearTimeout(timer);
                        if (!txt) return finish(null);
                        var data = null;
                        try { data = JSON.parse(txt); } catch (e) { }
                        finish(data && typeof data === 'object' ? data : null);
                    });
                }).catch(function () { clearTimeout(timer); finish(null); });
            } catch (e) { clearTimeout(timer); finish(null); }
        });
    }

    function buildCard(n) {
        var mask = document.createElement('div');
        mask.setAttribute('style', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;background:rgba(30,20,10,.48);display:flex;align-items:center;justify-content:center;padding:22px;-webkit-tap-highlight-color:transparent;');
        var card = document.createElement('div');
        card.setAttribute('style', 'background:linear-gradient(160deg,#fffaf2,#fff3e4);width:100%;max-width:340px;max-height:72vh;border-radius:18px;box-shadow:0 18px 50px rgba(60,35,10,.35);overflow:hidden;display:flex;flex-direction:column;transform:translateY(14px);opacity:0;transition:transform .26s ease,opacity .26s ease;');
        var head = document.createElement('div');
        head.setAttribute('style', 'padding:16px 18px 10px;display:flex;align-items:flex-start;gap:9px;');
        var badge = document.createElement('span');
        badge.setAttribute('style', 'font-size:19px;line-height:1.3;');
        badge.textContent = '\uD83D\uDCE2';
        var title = document.createElement('div');
        title.textContent = String(n.title || '公告');
        title.setAttribute('style', 'flex:1;font-size:17px;font-weight:700;color:#5b3a1e;line-height:1.45;word-break:break-all;font-family:inherit;');
        head.appendChild(badge);
        head.appendChild(title);
        var body = document.createElement('div');
        body.textContent = String(n.content || '');
        body.setAttribute('style', 'padding:0 18px 14px;font-size:14.5px;color:#6b4a2b;line-height:1.75;white-space:pre-wrap;word-break:break-word;overflow-y:auto;min-height:20px;font-family:inherit;');
        var foot = document.createElement('div');
        foot.setAttribute('style', 'padding:0 18px 16px;');
        var btn = document.createElement('button');
        btn.textContent = '我知道了';
        btn.setAttribute('style', 'width:100%;border:0;border-radius:12px;padding:11px 0;font-size:15px;font-weight:600;color:#fff;background:linear-gradient(135deg,#b9804b,#8b5a2b);box-shadow:0 4px 12px rgba(139,90,43,.35);cursor:pointer;font-family:inherit;');
        foot.appendChild(btn);
        card.appendChild(head);
        card.appendChild(body);
        card.appendChild(foot);
        mask.appendChild(card);
        function close() {
            card.style.transform = 'translateY(14px)';
            card.style.opacity = '0';
            setTimeout(function () {
                if (mask && mask.parentNode) mask.parentNode.removeChild(mask);
            }, 240);
        }
        btn.addEventListener('click', close);
        mask.addEventListener('click', function (ev) { if (ev.target === mask) close(); });
        return mask;
    }

    function maybeShow(n) {
        if (!n || typeof n !== 'object') return;
        if (n.enabled === false) return;
        var title = String(n.title || '').trim();
        var content = String(n.content || '').trim();
        if (!title && !content) return;
        var v = (typeof n.version === 'number' && isFinite(n.version)) ? n.version : 0;
        if (v <= getSeenVersion()) return;
        try {
            document.body.appendChild(buildCard(n));
            markSeen(v);
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    var card = document.querySelector('div[style*="2147483000"] > div');
                    if (card) { card.style.transform = 'translateY(0)'; card.style.opacity = '1'; }
                });
            });
        } catch (e) { }
    }

    function boot() {
        fetchNotice().then(maybeShow);
    }

    if (document.readyState === 'complete') {
        setTimeout(boot, 1200);
    } else {
        window.addEventListener('load', function () { setTimeout(boot, 1200); });
    }
})();
