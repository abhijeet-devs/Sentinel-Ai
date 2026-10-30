@echo off
cd /d "%~dp0"
title SentinelAI Backend (FastAPI)
echo ========================================================
echo   Starting SentinelAI Backend on http://localhost:8000
echo   API Docs: http://localhost:8000/api/docs
echo   (To copy text, right-click instead of Ctrl+C)
echo ========================================================
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
