/* 栗子空间 · 网关直连通用模块（公告/题库设置页共用）· 公开 Publishable Key */
(function () {
    'use strict';
    var GW = 'https://kongjian-d9gplvfce4e66ddb4.api.tcloudbasegateway.com';
    var BUCKET = 'chat';
    var PUBLISH_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjJlN2NkNDA4LWI2OWQtNGQ5My05MDI2LWUyZmMxZWMwNjE5NyJ9.eyJpc3MiOiJodHRwczovL2tvbmdqaWFuLWQ5Z3BsdmZjZTRlNjZkZGI0LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsImV4cCI6NDA5NDcwMTU4MywiaWF0IjoxNzkxMDE4MzgzLCJub25jZSI6IndweThLTkd0UmdxVy1sR0stSUhKS3ciLCJhdF9oYXNoIjoid3B5OEtOR3RSZ3FXLWxHSy1JSEpLdyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.P4FAu82jtD9nmBNAnsFAmIvOIgOHg6eG4o4-cOSc6T3rFcfPVINKk2vlWETgWsTx3T8pDdD_j7J-wrhxgPq4QS4dsNTHAEFlhN3F1-7UHGRxBWEYQBQM62bTS_gSK5IsNh5DjhAWpxMgcPj_Y0MZw84TO7N49_Kz9F2fqwGhPAsf4FmoqKTNkOvvET1eZA-Wy4LHsqTSALfsu3T-mRzCfACuBDW9FHRx9ZiRNnIi9zsiBDZ6yfObRmErin5F7T6LHIHoNfb4IPFrpOXPzV5jQbHP7sRDVYF6Cl6VI5ExODk5ypkUJ4Zht10zeOO2lz8jhwMDLd0GVX2eFJAJF3v2dg';
    function objUrl(p) { return GW + '/v1/storages/object/' + BUCKET + '/' + String(p).replace(/^\/+/, ''); }
    function gwGet(path) {
        var h = {}; h['Authorization'] = 'Bearer ' + PUBLISH_KEY;
        return fetch(objUrl(path), { method: 'GET', headers: h, cache: 'no-store' })
            .then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    }
    function gwPut(path, doc) {
        var h = {}; h['Authorization'] = 'Bearer ' + PUBLISH_KEY;
        h['Content-Type'] = 'application/json'; h['x-upsert'] = 'true';
        return fetch(objUrl(path), { method: 'POST', headers: h, body: JSON.stringify(doc) })
            .then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + (t ? '：' + t.slice(0, 160) : '')); }); return true; });
    }
    window.LiziGW = { get: gwGet, put: gwPut };
    window.AdminGW = { fetchCurrent: function () { return gwGet('lizi-space/notice.json'); }, saveNotice: function (d) { return gwPut('lizi-space/notice.json', d); } };
})();
