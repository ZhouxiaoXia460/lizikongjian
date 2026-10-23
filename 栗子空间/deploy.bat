@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ====== 栗子空间 一键部署 ======
echo.
echo [1/4] 同步 kongjian.html（与 index.html 保持一致）...
copy /Y index.html kongjian.html >nul
echo [2/4] 语法检查...
node check-syntax.cjs
if errorlevel 1 (
    echo.
    echo ❌ 语法检查未通过，已取消部署。请先修复上面的报错。
    pause
    exit /b 1
)
echo.
echo [3/4] 部署 index.html 到 TCB 静态托管...
call tcb hosting deploy index.html index.html -e kongjian-d9gplvfce4e66ddb4
if errorlevel 1 (
    echo.
    echo ❌ index.html 部署失败，请检查网络或 tcb 登录状态（tcb login）。
    pause
    exit /b 1
)
echo [3b] 部署 notice.js / admin.html（公告功能）...
call tcb hosting deploy notice.js notice.js -e kongjian-d9gplvfce4e66ddb4
if errorlevel 1 echo ⚠ notice.js 部署失败（公告弹窗不可用）
call tcb hosting deploy admin.html admin.html -e kongjian-d9gplvfce4e66ddb4
if errorlevel 1 echo ⚠ admin.html 部署失败（公告设置页不可用）
call tcb hosting deploy admin-gateway.js admin-gateway.js -e kongjian-d9gplvfce4e66ddb4
if errorlevel 1 echo ⚠ admin-gateway.js 部署失败（设置页无法读写云端）
echo [3c] 部署题库设置（truth-bank.js / truth-admin.html / 图标）...
call tcb hosting deploy truth-bank.js truth-bank.js -e kongjian-d9gplvfce4e66ddb4
if errorlevel 1 echo ⚠ truth-bank.js 部署失败（云题库加载不可用，应用自动用内置题库）
call tcb hosting deploy truth-admin.html truth-admin.html -e kongjian-d9gplvfce4e66ddb4
if errorlevel 1 echo ⚠ truth-admin.html 部署失败（题库设置页不可用）
call tcb hosting deploy truth-icon.png truth-icon.png -e kongjian-d9gplvfce4e66ddb4
if errorlevel 1 echo ⚠ truth-icon.png 部署失败（iOS 图标缺失）
echo.
echo [4/6] 部署 kongjian.html ...
call tcb hosting deploy sw.js sw.js -e kongjian-d9gplvfce4e66ddb4
if errorlevel 1 (
    echo.
    echo ⚠ sw.js 部署失败（PWA 离线需此文件），继续部署其余文件。
)
echo [5/6] 部署 manifest.json ...
call tcb hosting deploy manifest.json manifest.json -e kongjian-d9gplvfce4e66ddb4
echo [6/6] 部署图标 ...
call tcb hosting deploy icons\icon-192.png icons/icon-192.png -e kongjian-d9gplvfce4e66ddb4
call tcb hosting deploy icons\icon-512.png icons/icon-512.png -e kongjian-d9gplvfce4e66ddb4
call tcb hosting deploy kongjian.html kongjian.html -e kongjian-d9gplvfce4e66ddb4
echo.
echo ====================================
echo ✅ 部署完成！
echo 线上地址：https://kongjian-d9gplvfce4e66ddb4-1455016831.tcloudbaseapp.com/index.html
echo 提示：手机如果看到的还是旧版，是 CDN 缓存，等几分钟后强刷即可。
echo ====================================
pause

