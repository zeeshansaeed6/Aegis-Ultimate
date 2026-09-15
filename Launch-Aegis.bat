@echo off
title Aegis Private Search & Engine - Desktop Launcher
cd /d "%~dp0"
echo ==========================================================
echo   AEGIS PRIVATE SEARCH ENGINE - STANDALONE APPLICATION
echo ==========================================================
echo Starting Aegis Desktop Window & Privacy Engine...
if exist "node_modules\.bin\electron.cmd" (
    call "node_modules\.bin\electron.cmd" electron/main.js
) else (
    npx electron electron/main.js
)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Note: If electron failed, falling back to local server mode...
    start http://localhost:3000
    node server/server.js
)
pause
