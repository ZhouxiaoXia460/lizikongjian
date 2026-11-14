/* 栗子空间 · 云端情话加载器
 * 情话数据：TCB 云存储 chat 桶 lizi-space/love-quotes.json（与主应用同一网关通道）
 * 由「栗子情话设置」（quotes-admin.html / APK）自行维护；
 * 云端为非空数组时整体覆盖内置情话，云端为空/不存在时回落内置 20 句。
 */
(function () {
    'use strict';
    var BANK_URL = 'https://kongjian-d9gplvfce4e66ddb4.api.tcloudbasegateway.com/v1/storages/object/chat/lizi-space/love-quotes.json';
    var CACHE_KEY = 'lizi_love_quotes_cloud_v1';

    function cacheLoad() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                var o = JSON.parse(raw);
                if (o && Object.prototype.toString.call(o.quotes) === '[object Array]') window.LOVE_QUOTES_CLOUD = o;
            }
        } catch (e) { }
    }

    function apply(o) {
        window.LOVE_QUOTES_CLOUD = o;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(o)); } catch (e) { }
        // 云端更新后通知主应用：情话列表/轮换间隔可能变了，重设计时器
        try { if (typeof window.__loveQuoteOnCloudUpdate === 'function') window.__loveQuoteOnCloudUpdate(); } catch (e) { }
    }

    // 应用端统一从这里取情话：云端覆盖（非空数组）+ 内置兜底
    window.loveQuotes = function () {
        var builtin;
        try { builtin = LOVE_QUOTES; } catch (e) { return []; }
        var cloud = window.LOVE_QUOTES_CLOUD;
        if (cloud && Object.prototype.toString.call(cloud.quotes) === '[object Array]' && cloud.quotes.length) {
            return cloud.quotes.filter(function (q) { return typeof q === 'string' && q.trim(); });
        }
        return builtin;
    };

    window.loveQuotesIsCustom = function () {
        var q = window.loveQuotes();
        try { return q !== LOVE_QUOTES && q.length > 0; } catch (e) { return false; }
    };

    // 轮换间隔（秒）：云端下发，缺省/非法时回落 8 秒；范围 1～3600
    window.loveQuoteInterval = function () {
        var n = 8;
        try { n = parseInt(window.LOVE_QUOTES_CLOUD && window.LOVE_QUOTES_CLOUD.interval, 10); } catch (e) { }
        if (isNaN(n) || n < 1) n = 8;
        if (n > 3600) n = 3600;
        return n;
    };

    // 轮放起点（1 起算）：云端下发 startIndex，缺省 1；钳制到 1～列表长度
    window.loveQuoteStartIndex = function (listLen) {
        var n = 1;
        try { n = parseInt(window.LOVE_QUOTES_CLOUD && window.LOVE_QUOTES_CLOUD.startIndex, 10); } catch (e) { }
        if (isNaN(n) || n < 1) n = 1;
        if (listLen && n > listLen) n = listLen;
        return n;
    };
    window.loveQuotesLoadCloud = function () {
        try {
            if (!window.__loveCacheLoaded) { cacheLoad(); window.__loveCacheLoaded = true; }
            if (window.__loveQuotesLoading) return;
            window.__loveQuotesLoading = true;
            fetch(BANK_URL, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + ((typeof TCB_CONFIG !== 'undefined' && TCB_CONFIG.publishKey) || '') },
                cache: 'no-store'
            }).then(function (r) {
                if (!r.ok) throw new Error('http ' + r.status);
                return r.json();
            }).then(function (o) {
                window.__loveQuotesLoaded = true;
                if (o && Object.prototype.toString.call(o.quotes) === '[object Array]') apply(o);
            }).catch(function () {
                window.__loveQuotesLoaded = true;
            }).finally(function () {
                window.__loveQuotesLoading = false;
            });
        } catch (e) { window.__loveQuotesLoading = false; }
    };
})();
