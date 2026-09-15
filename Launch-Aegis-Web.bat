@echo off
title Aegis Private Search Engine - Web Server
cd /d "%~dp0"
echo ==========================================================
echo   AEGIS PRIVATE SEARCH ENGINE - WEB SERVER
echo ==========================================================
echo Starting Aegis Privacy Server on http://localhost:3000 ...
start http://localhost:3000
node server/server.js
pause
