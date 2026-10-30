@echo off
title SentinelAI - Frontend Server
echo ========================================================
echo       SentinelAI Frontend Server Launcher
echo ========================================================
cd /d "%~dp0frontend"
echo Starting Vite Dev Server on http://localhost:5173 ...
npm run dev
pause
