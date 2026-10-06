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
echo.
echo [4/4] 部署 kongjian.html ...
call tcb hosting deploy kongjian.html kongjian.html -e kongjian-d9gplvfce4e66ddb4
echo.
echo ====================================
echo ✅ 部署完成！
echo 线上地址：https://kongjian-d9gplvfce4e66ddb4-1455016831.tcloudbaseapp.com/index.html
echo 提示：手机如果看到的还是旧版，是 CDN 缓存，等几分钟后强刷即可。
echo ====================================
pause
