// 栗子空间 - 本地静态服务器（零依赖，node server.mjs 即可）
// 为什么需要它：腾讯云网关只放行 localhost 来源，双击打开(file://)会被 403 拒绝
// 额外能力：/gw 同源代理 —— 页面的云请求改由本服务器转发到腾讯云网关（服务器侧无 Origin，
// 网关放行），这样同一 Wi-Fi 下的手机（局域网IP访问）也能正常创建/加入空间
import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 8000);
// 【与 index.html 的 TCB_CONFIG.envId 保持一致】代理转发目标
const GW_TARGET = 'https://kongjian-d9gplvfce4e66ddb4.api.tcloudbasegateway.com';
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

// 把 /gw/xxx 转发到 GW_TARGET/xxx（保留方法/路径/查询串，剥掉浏览器身份头）
function proxyGw(req, res, restPath) {
    let upstream;
    try {
        const target = new URL(GW_TARGET + restPath);
        const fwdHeaders = { ...req.headers };
        delete fwdHeaders.host;
        delete fwdHeaders.origin;
        delete fwdHeaders.referer;
        fwdHeaders['accept-encoding'] = 'identity'; // 不压缩，避免中转处理编码
        upstream = httpsRequest(target, { method: req.method, headers: fwdHeaders }, (ur) => {
            const h = { ...ur.headers };
            delete h['content-encoding'];
            delete h['transfer-encoding'];
            delete h['content-length'];
            h['access-control-allow-origin'] = req.headers.origin || '*';
            res.writeHead(ur.statusCode || 502, h);
            ur.pipe(res);
        });
    } catch (e) {
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('GW代理错误: ' + e.message);
        return;
    }
    upstream.on('error', (e) => {
        try {
            res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('GW代理错误: ' + e.message);
        } catch (_) {}
    });
    req.pipe(upstream); // GET 无 body 时 pipe 也安全
}

const server = createServer(async (req, res) => {
    const rawUrl = req.url || '/';
    // 代理探测点：页面据此判断当前服务器是否提供 /gw 代理
    if (rawUrl === '/gw/__ping') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('pong'); return; }
    if (rawUrl.startsWith('/gw/')) { proxyGw(req, res, rawUrl.slice(3)); return; }

    try {
        let urlPath = decodeURIComponent(rawUrl.split('?')[0]);
        if (urlPath.endsWith('/')) urlPath += 'index.html';
        const filePath = normalize(join(ROOT, urlPath));
        if (!filePath.startsWith(normalize(ROOT))) { res.writeHead(403); res.end('Forbidden'); return; }
        const body = await readFile(filePath);
        res.writeHead(200, {
            'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store' // 便于改完代码刷新即生效
        });
        res.end(body);
    } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + e.message);
    }
});

// 监听所有网卡：让同一 Wi-Fi 下的手机能访问
server.listen(PORT, '0.0.0.0', () => {
    console.log('栗子空间已启动（按 Ctrl+C 停止）');
    console.log('  本机访问 : http://localhost:' + PORT + '/index.html');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log('  手机访问 : http://' + net.address + ':' + PORT + '/index.html   （手机连同一个Wi-Fi）');
            }
        }
    }
    console.log('  首次从手机访问时，Windows 防火墙弹窗请点「允许访问」');
});
