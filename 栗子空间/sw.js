// 栗子空间 Service Worker —— PWA 离线能力
// 策略：
//   · 页面导航（HTML）：网络优先，断网回退缓存（保证更新及时，断网也能玩）
//   · 同源静态资源（图标/清单等）：缓存优先
//   · 腾讯云 CDN 的 SDK 脚本：缓存优先后台刷新（离线时仍能初始化页面骨架）
//   · 云端 API / 其它第三方请求：一律直连网络，不做任何缓存（不碰业务数据）
const CACHE = 'lizikongjian-v4';
const CORE = [
    './',
    './index.html',
    './kongjian.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];
const CDN_OK = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net',
    'https://imgcache.qq.com'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    const req = e.request;
    if (req.method !== 'GET') return;
    let url;
    try { url = new URL(req.url); } catch (err) { return; }

    // 云端 API（TCB 网关 / 云函数 / 认证）：绝不缓存，直接放行走网络
    if (/tcloudbase|tcb\.|cloud\.tencent|tencentcdb|api\./i.test(url.hostname)) return;

    // 页面导航：网络优先，离线回退缓存
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        e.respondWith(
            fetch(req).then(function (res) {
                const cp = res.clone();
                caches.open(CACHE).then(function (c) { c.put(req, cp); });
                return res;
            }).catch(function () {
                return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
            })
        );
        return;
    }

    // 已知 CDN 的静态脚本/样式：缓存优先，后台更新
    if (CDN_OK.some(function (origin) { return url.origin === origin || url.href.indexOf(origin) === 0; })) {
        e.respondWith(
            caches.match(req).then(function (hit) {
                const net = fetch(req).then(function (res) {
                    if (res && res.ok) {
                        const cp = res.clone();
                        caches.open(CACHE).then(function (c) { c.put(req, cp); });
                    }
                    return res;
                }).catch(function () { return hit; });
                return hit || net;
            })
        );
        return;
    }

    // 其它同源静态资源：缓存优先
    if (url.origin === location.origin) {
        e.respondWith(
            caches.match(req).then(function (hit) {
                return hit || fetch(req).then(function (res) {
                    if (res && res.ok && (res.type === 'basic' || res.type === 'default')) {
                        const cp = res.clone();
                        caches.open(CACHE).then(function (c) { c.put(req, cp); });
                    }
                    return res;
                });
            })
        );
    }
});
