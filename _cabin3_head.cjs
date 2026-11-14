// head 注入 manifest + apple-touch-icon
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const anchor = '    <meta name="theme-color" content="#FFF9F0">';
if (!html.includes(anchor)) { console.error('head 锚点未找到'); process.exit(1); }
if (html.includes('manifest.json')) { console.log('已注入过，跳过'); process.exit(0); }
const inject = anchor + '\r\n' +
'    <!-- PWA：添加到主屏幕 / 离线运行（sw.js 提供本地缓存，断网也能装修小屋） -->\r\n' +
'    <link rel="manifest" href="manifest.json">\r\n' +
'    <link rel="apple-touch-icon" href="icons/icon-192.png">\r\n' +
'    <link rel="icon" type="image/png" href="icons/icon-192.png">';
html = html.replace(anchor, inject);
fs.writeFileSync('index.html', html, 'utf8');
console.log('head 注入完成 ✓');
