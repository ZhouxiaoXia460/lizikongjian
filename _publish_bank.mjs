// 发布/验证云端题库（scratch）
import fs from 'fs';
const bank = JSON.parse(fs.readFileSync('_builtin_bank.json', 'utf8'));
const KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjJlN2NkNDA4LWI2OWQtNGQ5My05MDI2LWUyZmMxZWMwNjE5NyJ9.eyJpc3MiOiJodHRwczovL2tvbmdqaWFuLWQ5Z3BsdmZjZTRlNjZkZGI0LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsImV4cCI6NDA5NDcwMTU4MywiaWF0IjoxNzkxMDE4MzgzLCJub25jZSI6IndweThLTkd0UmdxVy1sR0stSUhKS3ciLCJhdF9oYXNoIjoid3B5OEtOR3RSZ3FXLWxHSy1JSEpLdyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJrb25namlhbi1kOWdwbHZmY2U0ZTY2ZGRiNCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.P4FAu82jtD9nmBNAnsFAmIvOIgOHg6eG4o4-cOSc6T3rFcfPVINKk2vlWETgWsTx3T8pDdD_j7J-wrhxgPq4QS4dsNTHAEFlhN3F1-7UHGRxBWEYQBQM62bTS_gSK5IsNh5DjhAWpxMgcPj_Y0MZw84TO7N49_Kz9F2fqwGhPAsf4FmoqKTNkOvvET1eZA-Wy4LHsqTSALfsu3T-mRzCfACuBDW9FHRx9ZiRNnIi9zsiBDZ6yfObRmErin5F7T6LHIHoNfb4IPFrpOXPzV5jQbHP7sRDVYF6Cl6VI5ExODk5ypkUJ4Zht10zeOO2lz8jhwMDLd0GVX2eFJAJF3v2dg';
const BANK_URL = 'https://kongjian-d9gplvfce4e66ddb4.api.tcloudbasegateway.com/v1/storages/object/chat/lizi-space/truth-bank.json';
const H = { 'Authorization': 'Bearer ' + KEY };

// 1. 发布 v1（内置 300 题作为可编辑底稿）
const doc = { version: 1, updatedAt: '2026-10-22 22:10', source: 'builtin', qb: bank };
let r = await fetch(BANK_URL, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(doc) });
console.log('[1] PUBLISH v1 :', r.status, (await r.text()).slice(0, 100));

// 2. 回读验证
r = await fetch(BANK_URL, { headers: { ...H }, cache: 'no-store' });
const o = await r.json();
const counts = Object.keys(o.qb).map(k => k + ':' + o.qb[k].length).join(' ');
console.log('[2] VERIFY     :', r.status, 'v' + o.version, counts);
if (o.version !== 1 || o.qb.c1.length !== 90) { console.log('VERIFY FAIL'); process.exit(1); }
console.log('BANK PUBLISH OK');
