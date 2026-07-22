@echo off
title Yes I Can - Launcher
cd /d "%~dp0"

echo.
echo ==========================================
echo   Yes I Can - English Center Management
echo ==========================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found.
    echo         Install from https://python.org and check "Add to PATH"
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo         Install from https://nodejs.org
    pause
    exit /b 1
)

:: Setup backend venv
echo [1/4] Setting up Python environment...
if not exist "backend\venv" (
    python -m venv backend\venv
)
call backend\venv\Scripts\activate.bat

:: Install Python deps
echo [2/4] Installing backend dependencies...
pip install -q -r backend\requirements.txt

:: Seed data
echo [3/4] Loading demo data...
python backend\seed.py

:: Start backend
echo [4/4] Starting servers...
echo.
echo   Starting backend...
start "YIC Backend" /D "%~dp0backend" cmd /k "venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

:: Wait
timeout /t 4 /nobreak >nul

:: Start frontend
echo   Starting frontend...
if not exist "frontend\node_modules" (
    echo   Installing frontend dependencies (first time only^)...
    cd frontend && npm install && cd ..
)
start "YIC Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo   DONE! Both servers are running.
echo.
echo   Open your browser and go to:
echo   http://localhost:5173
echo.
echo   Login: admin / admin123
echo.
echo   Close the server windows to stop.
echo ==========================================
echo.
pause
