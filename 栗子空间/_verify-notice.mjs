// 公告功能端到端验证（scratch，验证后可删）
const ENV = 'kongjian-d9gplvfce4e66ddb4';
const KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjJlN2NkNDA4LWI2OWQtNGQ5My05MDI2LWUyZmMxZWMwNjE5NyJ9.eyJpc3MiOiJodHRwczovL2tvbmdqaWFuLWQ5Z3BsdmZjZTRlNjZkZGI0LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsImV4cCI6NDA5NDcwMTU4MywiaWF0IjoxNzkxMDE4MzgzLCJub25jZSI6IndweThLTkd0UmdxVy1sR0stSUhKS3ciLCJhdF9oYXNoIjoid3B5OEtOR3RSZ3FXLWxHSy1JSEpLdyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.P4FAu82jtD9nmBNAnsFAmIvOIgOHg6eG4o4-cOSc6T3rFcfPVINKk2vlWETgWsTx3T8pDdD_j7J-wrhxgPq4QS4dsNTHAEFlhN3F1-7UHGRxBWEYQBQM62bTS_gSK5IsNh5DjhAWpxMgcPj_Y0MZw84TO7N49_Kz9F2fqwGhPAsf4FmoqKTNkOvvET1eZA-Wy4LHsqTSALfsu3T-mRzCfACuBDW9FHRx9ZiRNnIi9zsiBDZ6yfObRmErin5F7T6LHIHoNfb4IPFrpOXPzV5jQbHP7sRDVYF6Cl6VI5ExODk5ypkUJ4Zht10zeOO2lz8jhwMDLd0GVX2eFJAJF3v2dg';
const URL = `https://${ENV}.api.tcloudbasegateway.com/v1/storages/object/chat/lizi-space/notice.json`;
const H = { 'Authorization': 'Bearer ' + KEY };

// 1. GET（预期 404，云端还没有公告）
let r = await fetch(URL, { headers: { ...H }, cache: 'no-store' });
console.log('[1] GET before :', r.status, (await r.text()).slice(0, 120));

// 2. POST 初始公告 v1（x-upsert 覆盖写）
const doc = {
    title: '🎉 栗子空间公告功能上线',
    content: '这是第一条演示公告：现在可以随时给进入空间的朋友们发通知了。\n公告只在设备第一次进入时弹出一次，之后不再打扰。',
    enabled: true,
    version: 1,
    updatedAt: '2026-10-22 20:35'
};
r = await fetch(URL, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: JSON.stringify(doc)
});
console.log('[2] POST v1    :', r.status, (await r.text()).slice(0, 160));

// 3. GET 回读
r = await fetch(URL, { headers: { ...H }, cache: 'no-store' });
const back = await r.json().catch(() => null);
console.log('[3] GET after  :', r.status, back ? `v${back.version} "${back.title}" enabled=${back.enabled}` : '(parse fail)');
if (!back || back.version !== 1 || back.title.indexOf('公告功能上线') < 0) { console.log('VERIFY FAIL'); process.exit(1); }
console.log('VERIFY OK');
