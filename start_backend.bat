@echo off
title SentinelAI - Backend Server
echo ========================================================
echo       SentinelAI Backend Server Launcher
echo ========================================================
cd /d "%~dp0backend"
echo Starting FastAPI with Uvicorn on http://localhost:8000 ...
echo (Tip: To copy terminal text safely, right-click instead of Ctrl+C)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
