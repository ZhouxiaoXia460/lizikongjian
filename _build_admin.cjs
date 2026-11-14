// 栗子空间 - 管理设置三合一构建脚本
// 1) 从旧 quotes-admin.html / truth-admin.html 原样抽取 BUILTIN_QUOTES / BUILTIN_QB 数据块
// 2) 注入 _frag_admin_shell.html 模板 -> 生成新 admin.html
// 3) 旧 quotes-admin.html / truth-admin.html 改为跳转壳（保留 title，APK 入口不受影响）
const fs = require('fs');
const path = require('path');

function read(f) { return fs.readFileSync(path.join(__dirname, f), 'utf8'); }
function write(f, s) { fs.writeFileSync(path.join(__dirname, f), s); console.log('[OK] 已写入 ' + f + '（' + s.length + ' 字符）'); }

// —— 抽取内置数据块 ——
function extractBlock(html, varName) {
    const re = new RegExp('<script>\\s*(' + varName + '[\\s\\S]*?)</script>', 'i');
    const m = html.match(re);
    if (!m) throw new Error('未找到 ' + varName + ' 数据块');
    return m[1].trim();
}
const adminHtml = read('admin.html');
const quotesData = extractBlock(adminHtml.indexOf('var BUILTIN_QUOTES') >= 0 ? adminHtml : read('quotes-admin.html'), 'var BUILTIN_QUOTES');
const truthData = extractBlock(adminHtml.indexOf('var BUILTIN_QB') >= 0 ? adminHtml : read('truth-admin.html'), 'var BUILTIN_QB');
console.log('[OK] 抽取 BUILTIN_QUOTES（' + quotesData.length + ' 字符）、BUILTIN_QB（' + truthData.length + ' 字符）');

// —— 组装 admin.html ——
const CRLF = '\r\n';
function crlf(s) { return s.replace(/\r?\n/g, CRLF); }
let shell = crlf(read('_frag_admin_shell.html'));
const inject = '<script>' + CRLF + crlf(quotesData) + CRLF + '</script>' + CRLF + '<script>' + CRLF + crlf(truthData) + CRLF + '</script>';
if (shell.indexOf('/*__BUILTIN_DATA__*/') < 0) throw new Error('模板缺少 __BUILTIN_DATA__ 标记');
shell = shell.replace('/*__BUILTIN_DATA__*/', inject);
write('admin.html', shell);

// —— 旧页改跳转壳（保留原 <title>，APK 打开后自动进入对应标签）——
function stub(title, emoji, hash) {
    return '<!DOCTYPE html>' + CRLF +
        '<html lang="zh-CN">' + CRLF +
        '<head>' + CRLF +
        '<meta charset="UTF-8">' + CRLF +
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' + CRLF +
        '<meta name="referrer" content="no-referrer">' + CRLF +
        '<title>' + title + '</title>' + CRLF +
        '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#f7ede1,#f3e3cd);font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#8a6a45;font-size:14px;}</style>' + CRLF +
        '</head>' + CRLF +
        '<body><div>' + emoji + ' ' + title + '已合并进「栗子管理设置」，正在跳转…</div>' + CRLF +
        '<script>location.replace("admin.html#' + hash + '");</script>' + CRLF +
        '</body>' + CRLF +
        '</html>';
}
write('quotes-admin.html', stub('栗子情话设置', '💌', 'love'));
write('truth-admin.html', stub('栗子题库设置', '🎴', 'truth'));
console.log('✅ 三合一构建完成。');
