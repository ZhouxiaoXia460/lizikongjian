// 测不同鉴权端点变体，找到真正生效的那条链路
import crypto from 'node:crypto';

const ENV = 'kongjian-d9gplvfce4e66ddb4';
const ORIGIN = 'https://kongjian-d9gplvfce4e66ddb4-1455016831.tcloudbaseapp.com';

function brief(text) {
    try {
        const j = JSON.parse(text);
        if (j.code) return `${j.code}: ${String(j.message).slice(0, 90)}`;
        return '✅✅ 成功! keys=' + Object.keys(j).join(',');
    } catch (e) { return text.slice(0, 120); }
}

const hosts = [
    `${ENV}.ap-shanghai.tcb-api.tencentcloudapi.com`,
    `${ENV}.tcb-api.tencentcloudapi.com`,
    `${ENV}.ap-shanghai.tcb-api.tencentcloud.com`,
    `${ENV}.tcb-api.tencentcloud.com`,
    `${ENV}.ap-shanghai.tcb-api.qcloud.la`,
];

for (const host of hosts) {
    const seq = crypto.randomUUID().replace(/-/g, '');
    try {
        const res = await fetch(`https://${host}/web`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-SDK-Version': '@cloudbase/js-sdk/2.27.1',
                'Origin': ORIGIN
            },
            body: JSON.stringify({ action: 'auth.signInAnonymously', dataVersion: '2020-01-10', env: ENV, data: { seqId: seq } }),
            signal: AbortSignal.timeout(15000)
        });
        console.log(`[${host}] HTTP ${res.status} → ${brief(await res.text())}`);
    } catch (e) {
        console.log(`[${host}] ❌ ${e.cause ? e.cause.code || e.cause.message : e.message}`);
    }
}
