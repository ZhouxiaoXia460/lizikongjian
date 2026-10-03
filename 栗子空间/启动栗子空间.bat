@echo off
chcp 65001 >nul
title 栗子空间 - 本地服务器
rem 为什么不能双击 html 打开：腾讯云网关只放行 localhost 来源，file:// 会被 403 拒绝
cd /d "%~dp0"
echo ============================================
echo   栗子空间 正在启动...
echo   启动后请在浏览器访问:
echo   http://localhost:8000/index.html
echo   （关闭本窗口即停止服务器）
echo ============================================
where node >nul 2>nul
if %errorlevel%==0 (
    node server.mjs
    goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
    py -m http.server 8000 --bind 127.0.0.1
    goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
    python -m http.server 8000 --bind 127.0.0.1
    goto :eof
)
echo [错误] 没找到 node 或 python，请先安装其中一个。
pause
