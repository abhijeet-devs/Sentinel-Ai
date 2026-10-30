@echo off
title SentinelAI - Launcher
echo ========================================================
echo       SentinelAI Complete System Launcher
echo ========================================================
echo Launching Backend server...
start "SentinelAI Backend" "%~dp0start_backend.bat"

echo Waiting for backend initialization...
timeout /t 3 /nobreak >nul

echo Launching Frontend application...
start "SentinelAI Frontend" "%~dp0start_frontend.bat"

echo ========================================================
echo   SentinelAI is starting!
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/api/docs (or /docs)
echo   Frontend: http://localhost:5173
echo ========================================================
