/* 栗子空间 · 云端真心话题库加载器
 * 题库数据：TCB 云存储 chat 桶 lizi-space/truth-bank.json（与主应用同一网关通道）
 * 由「栗子题库设置」（truth-admin.html / APK）自行维护；
 * 云端只覆盖出现过的分类，未覆盖的分类自动回落内置题库；云端全空时整体回落内置。
 */
(function () {
    'use strict';
    var BANK_URL = 'https://kongjian-d9gplvfce4e66ddb4.api.tcloudbasegateway.com/v1/storages/object/chat/lizi-space/truth-bank.json';
    var CACHE_KEY = 'lizi_truth_bank_v1';

    function cacheLoad() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                var o = JSON.parse(raw);
                if (o && o.qb && typeof o.qb === 'object') window.TRUTH_QB_CLOUD = o;
            }
        } catch (e) { }
    }

    function apply(o) {
        var prev = window.TRUTH_QB_CLOUD ? (window.TRUTH_QB_CLOUD.version || 0) : -1;
        window.TRUTH_QB_CLOUD = o;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(o)); } catch (e) { }
        if ((o.version || 0) !== prev) {
            try {
                if (typeof truthSetSource === 'function' && typeof truthState !== 'undefined') truthSetSource(truthState.source);
            } catch (e) { }
        }
    }

    // 应用端统一从这里取题库：云端覆盖 + 内置兜底合并
    window.truthQB = function () {
        var builtin;
        try { builtin = TRUTH_QB; } catch (e) { return null; }
        var cloud = window.TRUTH_QB_CLOUD;
        if (!cloud || !cloud.qb || typeof cloud.qb !== 'object') return builtin;
        var cats;
        try { cats = TRUTH_CATS; } catch (e) { return builtin; }
        var merged = {}, any = false;
        cats.forEach(function (c) {
            var cv = cloud.qb[c.id];
            if (Object.prototype.toString.call(cv) === '[object Array]') {
                merged[c.id] = cv;
                if (cv.length) any = true;
            } else {
                merged[c.id] = builtin[c.id] || [];
            }
        });
        return any ? merged : builtin;
    };

    window.truthLoadCloudBank = function () {
        try {
            if (!window.__truthCacheLoaded) { cacheLoad(); window.__truthCacheLoaded = true; }
            if (window.__truthBankLoading) return;
            window.__truthBankLoading = true;
            fetch(BANK_URL, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + ((typeof TCB_CONFIG !== 'undefined' && TCB_CONFIG.publishKey) || '') },
                cache: 'no-store'
            }).then(function (r) {
                if (!r.ok) throw new Error('http ' + r.status);
                return r.json();
            }).then(function (o) {
                window.__truthBankLoaded = true;
                if (o && o.qb && typeof o.qb === 'object') apply(o);
            }).catch(function () {
                window.__truthBankLoaded = true;
            }).finally(function () {
                window.__truthBankLoading = false;
            });
        } catch (e) { window.__truthBankLoading = false; }
    };
})();
