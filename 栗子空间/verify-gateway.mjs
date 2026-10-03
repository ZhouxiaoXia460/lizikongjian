// 端到端验证：Publishable Key 直连 PG 云存储 HTTP API（网关）
const ENV = 'kongjian-d9gplvfce4e66ddb4';
const KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjJlN2NkNDA4LWI2OWQtNGQ5My05MDI2LWUyZmMxZWMwNjE5NyJ9.eyJpc3MiOiJodHRwczovL2tvbmdqaWFuLWQ5Z3BsdmZjZTRlNjZkZGI0LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsImV4cCI6NDA5NDcwMTU4MywiaWF0IjoxNzkxMDE4MzgzLCJub25jZSI6IndweThLTkd0UmdxVy1sR0stSUhKS3ciLCJhdF9oYXNoIjoid3B5OEtOR3RSZ3FXLWxHSy1JSEpLdyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.P4FAu82jtD9nmBNAnsFAmIvOIgOHg6eG4o4-cOSc6T3rFcfPVINKk2vlWETgWsTx3T8pDdD_j7J-wrhxgPq4QS4dsNTHAEFlhN3F1-7UHGRxBWEYQBQM62bTS_gSK5IsNh5DjhAWpxMgcPj_Y0MZw84TO7N49_Kz9F2fqwGhPAsf4FmoqKTNkOvvET1eZA-Wy4LHsqTSALfsu3T-mRzCfACuBDW9FHRx9ZiRNnIi9zsiBDZ6yfObRmErin5F7T6LHIHoNfb4IPFrpOXPzV5jQbHP7sRDVYF6Cl6VI5ExODk5ypkUJ4Zht10zeOO2lz8jhwMDLd0GVX2eFJAJF3v2dg';
const BASE = `https://${ENV}.api.tcloudbasegateway.com`;
const AUTH = { 'Authorization': `Bearer ${KEY}` };

async function show(label, res, showBody = true) {
    const body = await res.text();
    console.log(`[${label}] HTTP ${res.status}${showBody ? ' → ' + body.slice(0, 500) : ''}`);
    return body;
}

// 1. 列出 buckets
try {
    const r = await fetch(`${BASE}/v1/storages/buckets`, { headers: { ...AUTH } });
    await show('列出buckets', r);
} catch (e) { console.log('[列出buckets] FAIL:', e.cause?.code || e.message); }

// 2. 上传测试对象（binary body + x-upsert）
const testPath = 'lizi-space/test-verify.json';
const payload = JSON.stringify({ hello: 'lizi', from: 'publishable-key', at: new Date().toISOString() });
try {
    const r = await fetch(`${BASE}/v1/storages/object/chat/${testPath}`, {
        method: 'POST',
        headers: { ...AUTH, 'Content-Type': 'application/json', 'x-upsert': 'true' },
        body: payload
    });
    await show(`上传到bucket=chat`, r);
} catch (e) { console.log('[上传chat] FAIL:', e.cause?.code || e.message); }

// 2b. 换默认系统 bucket 名试试
try {
    const r = await fetch(`${BASE}/v1/storages/object/6b6f-kongjian-d9gplvfce4e66ddb4-1455016831/${testPath}`, {
        method: 'POST',
        headers: { ...AUTH, 'Content-Type': 'application/json', 'x-upsert': 'true' },
        body: payload
    });
    await show('上传到系统bucket', r);
} catch (e) { console.log('[上传系统bucket] FAIL:', e.cause?.code || e.message); }

// 3. 下载回读
try {
    const r = await fetch(`${BASE}/v1/storages/object/chat/${testPath}`, { headers: { ...AUTH } });
    await show('下载回读(chat)', r);
} catch (e) { console.log('[下载] FAIL:', e.cause?.code || e.message); }
