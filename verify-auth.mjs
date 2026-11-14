// 快速单次测试：匿名登录是否已生效
import crypto from 'node:crypto';
const ENV = 'kongjian-d9gplvfce4e66ddb4';
const ORIGIN = 'https://kongjian-d9gplvfce4e66ddb4-1455016831.tcloudbaseapp.com';
const seq = crypto.randomUUID().replace(/-/g, '');
const res = await fetch(`https://${ENV}.ap-shanghai.tcb-api.tencentcloudapi.com/web`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SDK-Version': '@cloudbase/js-sdk/2.27.1', 'Origin': ORIGIN },
    body: JSON.stringify({ action: 'auth.signInAnonymously', dataVersion: '2020-01-10', env: ENV, data: { seqId: seq } })
});
const text = await res.text();
console.log('HTTP', res.status);
console.log(text.slice(0, 400));
